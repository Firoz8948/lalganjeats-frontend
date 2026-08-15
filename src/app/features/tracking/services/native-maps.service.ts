import { Injectable } from '@angular/core';
import { isMobileAppChannel } from '../../../core/utils/client-channel';

/**
 * Capacitor Google Maps bridge for Android / iOS.
 * Uses dynamic import so web builds work without the native package installed.
 * Install later: npm i @capacitor/core @capacitor/google-maps && npx cap sync
 */
@Injectable({ providedIn: 'root' })
export class NativeMapsService {
  isNativeApp(): boolean {
    return isMobileAppChannel();
  }

  async tryCreateNativeMap(
    elementId: string,
    apiKey: string,
    center: { lat: number; lng: number }
  ): Promise<boolean> {
    if (!this.isNativeApp()) return false;
    try {
      const load = new Function(
        'return import("@capacitor/google-maps")'
      ) as () => Promise<{ GoogleMap: any }>;
      const mod = await load().catch(() => null);
      if (!mod?.GoogleMap) return false;

      const el = document.getElementById(elementId);
      if (!el) return false;

      const map = await mod.GoogleMap.create({
        id: elementId,
        element: el,
        apiKey,
        config: { center, zoom: 14 },
      });
      (window as unknown as { __leNativeMap?: unknown }).__leNativeMap = map;
      return true;
    } catch {
      return false;
    }
  }

  async updateNativeRider(lat: number, lng: number, iconUrl?: string): Promise<void> {
    const w = window as unknown as {
      __leNativeMap?: {
        removeMarker: (id: string) => Promise<void>;
        addMarker: (opts: Record<string, unknown>) => Promise<string>;
        setCamera: (opts: Record<string, unknown>) => Promise<void>;
      };
      __leNativeRiderId?: string;
    };
    const map = w.__leNativeMap;
    if (!map) return;
    try {
      if (w.__leNativeRiderId) {
        await map.removeMarker(w.__leNativeRiderId);
      }
      w.__leNativeRiderId = await map.addMarker({
        coordinate: { lat, lng },
        title: 'Delivery partner',
        iconUrl: iconUrl || undefined,
      });
      await map.setCamera({ coordinate: { lat, lng }, animate: true });
    } catch {
      /* ignore */
    }
  }

  async destroyNativeMap(): Promise<void> {
    const w = window as unknown as {
      __leNativeMap?: { destroy: () => Promise<void> };
      __leNativeRiderId?: string;
    };
    if (!w.__leNativeMap) return;
    try {
      await w.__leNativeMap.destroy();
    } catch {
      /* ignore */
    }
    w.__leNativeMap = undefined;
    w.__leNativeRiderId = undefined;
  }
}
