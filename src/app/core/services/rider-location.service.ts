import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { DeliveryPortalService } from '../../features/delivery-portal/services/delivery-portal.service';

/**
 * Rider GPS policy for the WEB delivery portal (foreground only):
 *
 *  - Nothing is captured while idle / waiting for offers.
 *  - `captureOnce()` grabs a single fix when the rider taps Accept.
 *  - `startDeliveryTracking()` sends a fix to our backend every PING_MS
 *    (2 min) only while an order is picked up. Nothing here talks to Google.
 */
export const PING_MS = 2 * 60 * 1000;

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
}

@Injectable({ providedIn: 'root' })
export class RiderLocationService {
  private api = inject(DeliveryPortalService);

  tracking = signal(false);
  lastFix = signal<GpsFix | null>(null);
  lastSentAt = signal<number | null>(null);

  private orderIds: number[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible' && this.tracking()) {
      const last = this.lastSentAt() ?? 0;
      if (Date.now() - last > 60_000) void this.tick();
    }
  };

  async captureOnce(timeoutMs = 8000): Promise<GpsFix | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          await Geolocation.requestPermissions();
        }
      } catch {
        /* ignore */
      }
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 30_000,
        });
        return this.toFix(pos.coords);
      } catch {
        /* fall through */
      }
    }
    if (!navigator.geolocation) return null;
    return new Promise<GpsFix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(this.toFix(pos.coords)),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
      );
    });
  }

  async startDeliveryTracking(orderIds: number[]): Promise<void> {
    this.orderIds = [...orderIds].sort((a, b) => a - b);
    if (this.tracking()) return;
    this.tracking.set(true);
    document.addEventListener('visibilitychange', this.visibilityHandler);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), PING_MS);
  }

  async stopDeliveryTracking(): Promise<void> {
    if (!this.tracking()) return;
    this.tracking.set(false);
    this.orderIds = [];
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (!this.tracking()) return;
    const fix = await this.captureOnce(10_000);
    if (!fix || !this.tracking()) return;
    this.lastFix.set(fix);
    this.lastSentAt.set(Date.now());
    this.api
      .pingLocation(fix.latitude, fix.longitude, {
        order_id: this.orderIds[0],
        accuracy_m: fix.accuracy_m ?? null,
        source: 'pickup_ping',
      })
      .subscribe({ error: () => {} });
  }

  private toFix(c: { latitude: number; longitude: number; accuracy?: number | null }): GpsFix {
    return { latitude: c.latitude, longitude: c.longitude, accuracy_m: c.accuracy ?? null };
  }
}
