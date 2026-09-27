import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { TrackingService, TrackSnapshot } from '../../services/tracking.service';
import { TrackingWebsocketService } from '../../services/tracking-websocket.service';

/**
 * Customer order tracking.
 *
 * Cost policy (₹0 Google):
 *  - Before pickup: status only, no map, no rider position.
 *  - After pickup: Leaflet + OpenStreetMap tiles show the rider's last
 *    position, refreshed every `rider_ping_seconds` (2 min) via WebSocket
 *    push with a slow REST poll as fallback. No routing API is called —
 *    a straight dashed line links rider → destination.
 */
const DEFAULT_CENTER: L.LatLngTuple = [25.86, 85.18];
const DEFAULT_POLL_MS = 120_000;

@Component({
  selector: 'app-order-live-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-live-map.component.html',
  styleUrl: './order-live-map.component.scss',
})
export class OrderLiveMapComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) orderId!: number;
  /** Compact card embed (order details) vs full tracking page. */
  @Input() compact = false;

  @ViewChild('mapHost') mapHost?: ElementRef<HTMLDivElement>;

  private tracking = inject(TrackingService);
  private ws = inject(TrackingWebsocketService);

  readonly riderIconUrl = 'assets/icons/delivery-man.png';

  snap = signal<TrackSnapshot | null>(null);
  error = signal('');
  liveMode = signal<'websocket' | 'rest-fallback' | 'connecting'>('connecting');
  mapReady = signal(false);
  /** "Updated 2 min ago" — re-evaluated every 30 s. */
  updatedAgo = signal('');

  private map?: L.Map;
  private riderMarker?: L.Marker;
  private destMarker?: L.Marker;
  private line?: L.Polyline;
  private fitted = false;
  private viewReady = false;
  private wsSub?: Subscription;
  private poll?: ReturnType<typeof setInterval>;
  private agoTimer?: ReturnType<typeof setInterval>;
  private pollMs = DEFAULT_POLL_MS;
  private startedForId = 0;

  ngOnInit() {
    this.bootstrap();
    this.agoTimer = setInterval(() => this.refreshAgo(), 30_000);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderId'] && !changes['orderId'].firstChange) {
      this.teardown();
      this.bootstrap();
    }
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.tryInitMap();
  }

  ngOnDestroy() {
    this.teardown();
    if (this.agoTimer) clearInterval(this.agoTimer);
  }

  // ── Derived view helpers ───────────────────────────────────

  /** Rider position is only shared after pickup. */
  showMap(): boolean {
    const s = this.snap();
    return !!s && !!s.rider && (s.live_tracking || s.order_status === 'picked_up'
      || s.order_status === 'out_for_delivery');
  }

  awaitingPickup(): boolean {
    const s = this.snap();
    if (!s) return false;
    return ['pending', 'accepted', 'ready'].includes(s.order_status || '');
  }

  pingMinutes(): number {
    const secs = this.snap()?.rider_ping_seconds || this.pollMs / 1000;
    return Math.max(1, Math.round(secs / 60));
  }

  private refreshAgo() {
    const at = this.snap()?.updated_at;
    if (!at) {
      this.updatedAgo.set('');
      return;
    }
    const diff = Math.max(0, Date.now() - new Date(at).getTime());
    const mins = Math.round(diff / 60_000);
    this.updatedAgo.set(mins <= 0 ? 'Updated just now' : `Updated ${mins} min ago`);
  }

  // ── Lifecycle ──────────────────────────────────────────────

  private bootstrap() {
    if (!this.orderId) return;
    this.startedForId = this.orderId;
    this.snap.set(null);
    this.error.set('');
    this.liveMode.set('connecting');
    this.fitted = false;

    this.tracking.publicConfig().subscribe({
      next: (cfg) => {
        const secs = cfg.rider_ping_seconds || cfg.track_poll_seconds;
        if (secs && secs >= 30) this.pollMs = secs * 1000;
        this.startLiveUpdates();
      },
      error: () => this.startLiveUpdates(),
    });
  }

  private teardown() {
    this.wsSub?.unsubscribe();
    this.wsSub = undefined;
    this.ws.disconnect();
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = undefined;
    }
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    this.riderMarker = undefined;
    this.destMarker = undefined;
    this.line = undefined;
    this.mapReady.set(false);
  }

  private startLiveUpdates() {
    if (this.startedForId !== this.orderId) return;
    this.fetchOnce();

    this.wsSub = this.ws.connect(this.orderId).subscribe({
      next: (msg) => {
        if (msg.type === 'track_update') {
          this.liveMode.set('websocket');
          this.onSnapshot(msg.data);
        } else if (msg.type === 'error') {
          this.error.set(msg.detail);
          this.liveMode.set('rest-fallback');
        }
      },
      error: () => this.liveMode.set('rest-fallback'),
    });

    // Slow safety poll (2 min) — matches the rider's ping interval, so it
    // never asks more often than new data can exist.
    this.poll = setInterval(() => this.fetchOnce(), this.pollMs);

    setTimeout(() => {
      if (this.liveMode() === 'connecting') this.liveMode.set('rest-fallback');
    }, 5000);
  }

  private fetchOnce() {
    if (!this.orderId) return;
    this.tracking.trackOrder(this.orderId).subscribe({
      next: (s) => this.onSnapshot(s),
      error: (e: { error?: { detail?: string } }) => {
        if (!this.snap()) this.error.set(e.error?.detail || 'Failed to load tracking');
      },
    });
  }

  private onSnapshot(s: TrackSnapshot) {
    this.snap.set(s);
    this.error.set('');
    this.refreshAgo();
    // The map host only exists in the DOM after pickup; give CD one tick.
    setTimeout(() => {
      this.tryInitMap();
      this.applySnapshot(s);
    }, 0);
  }

  // ── Leaflet ────────────────────────────────────────────────

  private tryInitMap() {
    if (this.map || !this.viewReady || !this.showMap()) return;
    const host = this.mapHost?.nativeElement;
    if (!host) return;

    this.map = L.map(host, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.mapReady.set(true);
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  private applySnapshot(s: TrackSnapshot) {
    if (!this.map || !s.rider) return;
    const rider: L.LatLngTuple = [s.rider.lat, s.rider.lng];

    if (!this.riderMarker) {
      this.riderMarker = L.marker(rider, {
        icon: L.icon({
          iconUrl: this.riderIconUrl,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        }),
        title: 'Delivery partner',
        zIndexOffset: 1000,
      }).addTo(this.map);
    } else {
      this.riderMarker.setLatLng(rider);
    }

    const dest = s.destination || s.customer;
    if (dest) {
      const d: L.LatLngTuple = [dest.lat, dest.lng];
      if (!this.destMarker) {
        this.destMarker = L.marker(d, {
          icon: L.divIcon({
            className: 'le-dest-pin',
            html: '<span></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          title: 'Delivery address',
        }).addTo(this.map);
      } else {
        this.destMarker.setLatLng(d);
      }
      if (!this.line) {
        this.line = L.polyline([rider, d], {
          color: '#e10000',
          weight: 4,
          opacity: 0.85,
          dashArray: '8 8',
        }).addTo(this.map);
      } else {
        this.line.setLatLngs([rider, d]);
      }
      if (!this.fitted) {
        this.map.fitBounds(L.latLngBounds([rider, d]), { padding: [40, 40], maxZoom: 16 });
        this.fitted = true;
        return;
      }
    } else if (!this.fitted) {
      this.map.setView(rider, 15);
      this.fitted = true;
      return;
    }
    this.map.panTo(rider, { animate: true });
  }
}
