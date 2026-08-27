/// <reference types="google.maps" />
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
import { GoogleMapsLoaderService } from '../../services/google-maps-loader.service';
import { TrackingService, TrackSnapshot } from '../../services/tracking.service';
import { TrackingWebsocketService } from '../../services/tracking-websocket.service';
import { NativeMapsService } from '../../services/native-maps.service';

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
  private mapsLoader = inject(GoogleMapsLoaderService);
  private ws = inject(TrackingWebsocketService);
  private nativeMaps = inject(NativeMapsService);

  readonly riderIconUrl = 'assets/icons/delivery-man.png';

  snap = signal<TrackSnapshot | null>(null);
  error = signal('');
  mapsReady = signal(false);
  mapsMissingKey = signal(false);
  liveMode = signal<'websocket' | 'rest-fallback' | 'connecting'>('connecting');
  usingNativeMap = signal(false);

  private map?: google.maps.Map;
  private riderMarker?: google.maps.Marker;
  private destMarker?: google.maps.Marker;
  private directionsService?: google.maps.DirectionsService;
  private directionsRenderer?: google.maps.DirectionsRenderer;
  private lastRouteKey = '';
  private viewReady = false;
  private apiKey = '';
  private wsSub?: Subscription;
  private fallbackPoll?: ReturnType<typeof setInterval>;
  private startedForId = 0;

  get nativeMapElementId(): string {
    return `le-native-map-${this.orderId || 0}`;
  }

  ngOnInit() {
    this.bootstrap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['orderId'] && !changes['orderId'].firstChange) {
      this.teardownLive();
      this.bootstrap();
    }
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.tryInitMap();
  }

  ngOnDestroy() {
    this.teardownLive();
  }

  private bootstrap() {
    if (!this.orderId) return;
    this.startedForId = this.orderId;
    this.snap.set(null);
    this.error.set('');
    this.liveMode.set('connecting');

    this.tracking.publicConfig().subscribe({
      next: async (cfg) => {
        if (this.startedForId !== this.orderId) return;
        this.apiKey = cfg.google_maps_api_key || '';
        if (!this.apiKey) {
          this.mapsMissingKey.set(true);
          this.startLiveUpdates();
          return;
        }

        if (this.nativeMaps.isNativeApp()) {
          const ok = await this.nativeMaps.tryCreateNativeMap(
            this.nativeMapElementId,
            this.apiKey,
            { lat: 25.86, lng: 85.18 },
          );
          if (ok) {
            this.usingNativeMap.set(true);
            this.mapsReady.set(true);
            this.startLiveUpdates();
            return;
          }
        }

        this.mapsLoader
          .load(this.apiKey)
          .then(() => {
            if (this.startedForId !== this.orderId) return;
            this.mapsReady.set(true);
            this.tryInitMap();
            this.startLiveUpdates();
          })
          .catch((e: Error) => {
            this.error.set(e?.message || 'Failed to load Google Maps');
            this.startLiveUpdates();
          });
      },
      error: () => {
        this.error.set('Could not load maps config');
        this.startLiveUpdates();
      },
    });
  }

  private teardownLive() {
    this.wsSub?.unsubscribe();
    this.wsSub = undefined;
    this.ws.disconnect();
    if (this.fallbackPoll) {
      clearInterval(this.fallbackPoll);
      this.fallbackPoll = undefined;
    }
    void this.nativeMaps.destroyNativeMap();
    this.map = undefined;
    this.riderMarker = undefined;
    this.destMarker = undefined;
    this.directionsService = undefined;
    this.directionsRenderer = undefined;
    this.lastRouteKey = '';
  }

  private startLiveUpdates() {
    this.tracking.trackOrder(this.orderId).subscribe({
      next: (s) => this.onSnapshot(s),
      error: (e: { error?: { detail?: string } }) => {
        this.error.set(e.error?.detail || 'Failed to load tracking');
      },
    });

    this.wsSub = this.ws.connect(this.orderId).subscribe({
      next: (msg) => {
        if (msg.type === 'track_update') {
          this.liveMode.set('websocket');
          if (this.fallbackPoll) {
            clearInterval(this.fallbackPoll);
            this.fallbackPoll = undefined;
          }
          this.onSnapshot(msg.data);
        } else if (msg.type === 'error') {
          this.error.set(msg.detail);
          this.enableRestFallback();
        }
      },
      error: () => this.enableRestFallback(),
    });

    setTimeout(() => {
      if (this.liveMode() === 'connecting') {
        this.enableRestFallback();
      }
    }, 4000);
  }

  private enableRestFallback() {
    if (this.fallbackPoll) return;
    this.liveMode.set('rest-fallback');
    this.fallbackPoll = setInterval(() => {
      this.tracking.trackOrder(this.orderId).subscribe({
        next: (s) => this.onSnapshot(s),
        error: () => {},
      });
    }, 4000);
  }

  private onSnapshot(s: TrackSnapshot) {
    this.snap.set(s);
    if (s.google_maps_api_key && !this.apiKey) {
      this.apiKey = s.google_maps_api_key;
      this.mapsMissingKey.set(false);
    }
    void this.applySnapshot(s);
  }

  private tryInitMap() {
    if (this.usingNativeMap()) return;
    if (!this.viewReady || !this.mapsReady() || this.map) return;
    const host = this.mapHost?.nativeElement;
    const g = window.google;
    if (!host || !g?.maps) return;

    this.map = new g.maps.Map(host, {
      center: { lat: 25.86, lng: 85.18 },
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });

    this.directionsService = new g.maps.DirectionsService();
    this.directionsRenderer = new g.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#ff0000',
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });

    const s = this.snap();
    if (s) void this.applySnapshot(s);
  }

  private async applySnapshot(s: TrackSnapshot) {
    if (this.usingNativeMap() && s.rider) {
      await this.nativeMaps.updateNativeRider(
        s.rider.lat,
        s.rider.lng,
        this.riderIconUrl,
      );
      return;
    }

    if (!this.map || !window.google?.maps) return;
    const g = window.google;

    if (s.rider) {
      if (!this.riderMarker) {
        this.riderMarker = new g.maps.Marker({
          map: this.map,
          position: s.rider,
          title: 'Delivery partner',
          icon: {
            url: this.riderIconUrl,
            scaledSize: new g.maps.Size(48, 48),
            anchor: new g.maps.Point(24, 24),
          },
        });
      } else {
        this.riderMarker.setPosition(s.rider);
      }
      this.map.panTo(s.rider);
    }

    if (s.destination) {
      if (!this.destMarker) {
        this.destMarker = new g.maps.Marker({
          map: this.map,
          position: s.destination,
          title: s.phase === 'to_restaurant' ? 'Restaurant' : 'Delivery address',
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#1a1a1a',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        });
      } else {
        this.destMarker.setPosition(s.destination);
      }
    }

    if (s.rider && s.destination && this.directionsService && this.directionsRenderer) {
      const key =
        `${s.rider.lat.toFixed(4)},${s.rider.lng.toFixed(4)}|` +
        `${s.destination.lat.toFixed(4)},${s.destination.lng.toFixed(4)}`;
      if (key !== this.lastRouteKey) {
        this.lastRouteKey = key;
        this.directionsService.route(
          {
            origin: s.rider,
            destination: s.destination,
            travelMode: g.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK' && result) {
              this.directionsRenderer!.setDirections(result);
            }
          },
        );
      }
    }
  }
}
