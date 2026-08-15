import { Injectable, computed, signal } from '@angular/core';

export interface CustomerLocation {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'map' | 'manual';
}

const STORAGE_KEY = 'le_customer_location_v1';

@Injectable({ providedIn: 'root' })
export class CustomerLocationService {
  private readonly _location = signal<CustomerLocation | null>(this._load());

  readonly location = computed(() => this._location());
  readonly hasLocation = computed(() => this._location() != null);
  readonly displayLabel = computed(
    () => this._location()?.label?.trim() || 'Choose location'
  );
  readonly latitude = computed(() => this._location()?.lat ?? null);
  readonly longitude = computed(() => this._location()?.lng ?? null);

  setLocation(loc: CustomerLocation): void {
    const next: CustomerLocation = {
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      label: (loc.label || '').trim() || this._fallbackLabel(loc.lat, loc.lng),
      source: loc.source,
    };
    this._location.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private mode */
    }
  }

  clear(): void {
    this._location.set(null);
    localStorage.removeItem(STORAGE_KEY);
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
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        label: parsed.label || this._fallbackLabel(parsed.lat, parsed.lng),
        source: parsed.source || 'manual',
      };
    } catch {
      return null;
    }
  }
}
