import { Injectable, computed, signal } from '@angular/core';

export interface CustomerLocation {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'map' | 'manual';
  selectedAt?: number;
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
      selectedAt: Date.now(),
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

  shouldPromptAutomatically(): boolean {
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
