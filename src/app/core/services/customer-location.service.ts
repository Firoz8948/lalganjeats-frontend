/// <reference types="google.maps" />
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GoogleMapsLoaderService } from '../../features/tracking/services/google-maps-loader.service';
import { TrackingService } from '../../features/tracking/services/tracking.service';

export interface CustomerLocation {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'map' | 'manual';
  selectedAt?: number;
  isWithinZone?: boolean;
}

const STORAGE_KEY = 'le_customer_location_v1';
const PROMPT_KEY = 'le_location_auto_prompt_v1';
/** Re-ask after a long absence even if a pin was previously saved. */
const LOCATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * After an automatic prompt is shown (and maybe dismissed), wait before
 * auto-opening again so navbar remounts across routes do not spam the modal.
 */
const PROMPT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CustomerLocationService {
  private readonly _location = signal<CustomerLocation | null>(this._load());
  private readonly _detecting = signal(false);
  private readonly _isOutsideZone = signal(false);
  private readonly _isRetrying = signal(false);
  private _detectionPromise: Promise<void> | null = null;
  private _retryTimer: any = null;

  private readonly http = inject(HttpClient);
  private readonly tracking = inject(TrackingService);
  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  readonly location = computed(() => this._location());
  readonly hasLocation = computed(() => this._location() != null);
  readonly displayLabel = computed(
    () => this._location()?.label?.trim() || 'Choose location'
  );
  readonly latitude = computed(() => this._location()?.lat ?? null);
  readonly longitude = computed(() => this._location()?.lng ?? null);
  /** True while we're actively asking the OS for the current position. */
  readonly detecting = computed(() => this._detecting());
  /** True when the GPS position is outside the tenant delivery zone. */
  readonly isOutsideZone = computed(() => this._isOutsideZone());
  /** True when auto-polling every 5 seconds until user is inside delivery zone. */
  readonly isRetrying = computed(() => this._isRetrying());

  setLocation(loc: CustomerLocation): void {
    this._stopRetryLoop();
    this._isOutsideZone.set(false);
    this._isRetrying.set(false);

    const next: CustomerLocation = {
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      label: (loc.label || '').trim() || this._fallbackLabel(loc.lat, loc.lng),
      source: loc.source,
      selectedAt: Date.now(),
      isWithinZone: loc.isWithinZone ?? true,
    };
    this._location.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }

  clear(): void {
    this._stopRetryLoop();
    this._isOutsideZone.set(false);
    this._isRetrying.set(false);
    this._location.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private _stopRetryLoop(): void {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
  }

  shouldPromptAutomatically(): boolean {
    if (this._detecting() || this._isRetrying()) return false;
    const location = this._location();
    const needsChoice =
      !location || Date.now() - (location.selectedAt || 0) > LOCATION_MAX_AGE_MS;
    if (!needsChoice) return false;
    return Date.now() - this._lastPromptedAt() > PROMPT_COOLDOWN_MS;
  }

  markAutoPrompted(): void {
    try {
      localStorage.setItem(
        PROMPT_KEY,
        JSON.stringify({ lastPromptedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }

  /**
   * Acquire GPS + check if within delivery zone:
   * - If within zone: save location and stop (never re-fetch automatically).
   * - If outside zone: re-fetch GPS every 5s until within delivery zone.
   */
  initAutoDetect(): Promise<void> {
    if (this._detectionPromise) return this._detectionPromise;
    // Fresh saved location that is within zone → nothing to do.
    const current = this._location();
    if (current && !this._isStale(current) && current.isWithinZone !== false) {
      return Promise.resolve();
    }
    this._detecting.set(true);
    this._detectionPromise = this._runDetection().finally(() => {
      this._detecting.set(false);
    });
    return this._detectionPromise;
  }

  waitForDetection(): Promise<void> {
    return this._detectionPromise || Promise.resolve();
  }

  private async _checkIfWithinZone(lat: number, lng: number): Promise<boolean> {
    try {
      const url = `${environment.apiBaseUrl}/restaurants?lat=${lat}&lng=${lng}`;
      const restaurants = await firstValueFrom(this.http.get<any[]>(url));
      return Array.isArray(restaurants) && restaurants.length > 0;
    } catch {
      return false;
    }
  }

  private async _runDetection(): Promise<void> {
    try {
      const coords = await this._acquireCoords();
      if (!coords) {
        // If GPS permission denied or failed, don't spin in a tight loop
        this._isRetrying.set(false);
        return;
      }

      const inZone = await this._checkIfWithinZone(coords.lat, coords.lng);
      const label = await this._reverseGeocode(coords.lat, coords.lng);

      if (inZone) {
        // User is WITHIN delivery zone: save location and stop polling
        this._stopRetryLoop();
        this._isOutsideZone.set(false);
        this._isRetrying.set(false);
        this.setLocation({
          lat: coords.lat,
          lng: coords.lng,
          label,
          source: 'gps',
          isWithinZone: true,
        });
      } else {
        // User is OUTSIDE delivery zone: keep polling every 5s until inside zone
        this._isOutsideZone.set(true);
        this._isRetrying.set(true);
        this._location.set({
          lat: coords.lat,
          lng: coords.lng,
          label,
          source: 'gps',
          selectedAt: Date.now(),
          isWithinZone: false,
        });
        this._scheduleRetry();
      }
    } catch {
      this._scheduleRetry();
    }
  }

  private _scheduleRetry(): void {
    this._stopRetryLoop();
    this._retryTimer = setTimeout(async () => {
      // If user has chosen a manual location in the meantime, stop retry loop
      const current = this._location();
      if (current && (current.source === 'manual' || current.source === 'map')) {
        this._isRetrying.set(false);
        this._isOutsideZone.set(false);
        return;
      }
      await this._runDetection();
    }, 5000);
  }

  private async _acquireCoords(): Promise<{ lat: number; lng: number } | null> {
    // Native (Capacitor) → use plugin so we get the proper Android OS
    // permission dialog and background-safe positioning.
    if (Capacitor.isNativePlatform()) {
      try {
        const check = await Geolocation.checkPermissions();
        const already =
          check.location === 'granted' || check.coarseLocation === 'granted';
        if (!already) {
          const req = await Geolocation.requestPermissions({
            permissions: ['location', 'coarseLocation'],
          });
          if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
            return null;
          }
        }
        // Fast attempt: coarse first (WiFi/cell) — usually accurate enough
        // for zone matching and completes in well under 2s.
        try {
          const coarse = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 6000,
            maximumAge: 60000,
          });
          return { lat: coarse.coords.latitude, lng: coarse.coords.longitude };
        } catch {
          const fine = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
          return { lat: fine.coords.latitude, lng: fine.coords.longitude };
        }
      } catch {
        return null;
      }
    }

    // Web / PWA → browser Geolocation API.  Two-stage: fast coarse first,
    // fall back to high-accuracy if coarse fails.
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {
          navigator.geolocation.getCurrentPosition(
            (p2) => resolve({ lat: p2.coords.latitude, lng: p2.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
          );
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
      );
    });
  }

  private async _reverseGeocode(lat: number, lng: number): Promise<string> {
    const fallback = this._fallbackLabel(lat, lng);
    try {
      const cfg = await firstValueFrom(this.tracking.publicConfig());
      const key = cfg?.google_maps_api_key || '';
      if (!key) return fallback;
      const google = await this.mapsLoader.load(key);
      const geocoder = new google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      const full = res.results?.[0]?.formatted_address;
      return this._shortLabel(full) || fallback;
    } catch {
      return fallback;
    }
  }

  /** Geocoders return full postal addresses; the navbar chip only needs the
   *  locality — the same shortening rule the navbar uses. */
  private _shortLabel(full: string | undefined | null): string {
    if (!full) return '';
    const parts = full
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && !/^\d{6}$/.test(p) && p.toLowerCase() !== 'india');
    return parts.slice(0, 2).join(', ');
  }

  private _isStale(loc: CustomerLocation | null): boolean {
    if (!loc) return true;
    return Date.now() - (loc.selectedAt || 0) > LOCATION_MAX_AGE_MS;
  }

  private _lastPromptedAt(): number {
    try {
      const raw = localStorage.getItem(PROMPT_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { lastPromptedAt?: number };
      return typeof parsed?.lastPromptedAt === 'number' ? parsed.lastPromptedAt : 0;
    } catch {
      return 0;
    }
  }

  private _fallbackLabel(lat: number, lng: number): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  private _load(): CustomerLocation | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CustomerLocation;
      if (
        typeof parsed?.lat !== 'number' ||
        typeof parsed?.lng !== 'number' ||
        Number.isNaN(parsed.lat) ||
        Number.isNaN(parsed.lng)
      ) {
        return null;
      }
      const loaded: CustomerLocation = {
        lat: parsed.lat,
        lng: parsed.lng,
        label: parsed.label || this._fallbackLabel(parsed.lat, parsed.lng),
        source: parsed.source || 'manual',
        selectedAt: parsed.selectedAt || Date.now(),
      };
      if (!parsed.selectedAt) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
      }
      return loaded;
    } catch {
      return null;
    }
  }
}
