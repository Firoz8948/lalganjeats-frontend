import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { environment } from '../../../environments/environment';

export interface AppManifest {
  update_available: boolean;
  version?: string;
  bundle_url?: string;
  checksum?: string;
  release_notes?: string;
  is_mandatory?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LiveUpdateService {
  private http = inject(HttpClient);
  private isChecking = false;

  constructor() {
    this.checkForUpdates();
  }

  async checkForUpdates() {
    if (!Capacitor.isNativePlatform()) return;
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // 1. Crucial: Notify Capgo that current app bundle loaded successfully
      await CapacitorUpdater.notifyAppReady();

      // 2. Determine current active bundle version
      let currentVersion = localStorage.getItem('le_ota_version') || environment.version || '1.0.0';
      try {
        const currentBundle = await CapacitorUpdater.current();
        if (
          currentBundle?.bundle?.version &&
          currentBundle.bundle.version !== 'builtin' &&
          currentBundle.bundle.version !== 'default'
        ) {
          currentVersion = currentBundle.bundle.version;
          localStorage.setItem('le_ota_version', currentVersion);
        }
      } catch (e) {
        console.warn('[OTA] Could not query current bundle:', e);
      }

      console.log(`[OTA] Checking updates for customer app. Active version: ${currentVersion}`);

      const url = `${environment.apiBaseUrl}/app-updates/manifest?app_id=customer&version=${encodeURIComponent(currentVersion)}`;
      this.http.get<AppManifest>(url).subscribe({
        next: async (manifest) => {
          if (!manifest.update_available || !manifest.bundle_url || !manifest.version) {
            console.log('[OTA] App is up to date.');
            return;
          }

          // Safety guard: if already on this version, do not re-download or reload
          if (manifest.version === currentVersion) {
            console.log('[OTA] Already running version', manifest.version);
            return;
          }

          console.log(`[OTA] Downloading live update version ${manifest.version}...`);
          try {
            const bundle = await CapacitorUpdater.download({
              url: manifest.bundle_url,
              version: manifest.version,
              checksum: manifest.checksum || undefined,
            });

            if (bundle) {
              console.log(`[OTA] Live update ${manifest.version} downloaded.`);
              localStorage.setItem('le_ota_version', manifest.version);
              await CapacitorUpdater.set(bundle);

              if (manifest.is_mandatory) {
                const reloadedKey = `le_ota_reloaded_${manifest.version}`;
                if (!sessionStorage.getItem(reloadedKey)) {
                  sessionStorage.setItem(reloadedKey, 'true');
                  console.log(`[OTA] Reloading app for mandatory update ${manifest.version}...`);
                  await CapacitorUpdater.reload();
                }
              }
            }
          } catch (err) {
            console.warn('[OTA] Download failed:', err);
          }
        },
        error: (err) => {
          console.warn('[OTA] Manifest check failed:', err);
        },
      });
    } catch (e) {
      console.warn('[OTA] Check failed:', e);
    } finally {
      this.isChecking = false;
    }
  }
}
