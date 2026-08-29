import { Injectable, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const TOKEN_CACHE_KEY = 'le_fcm_token';

@Injectable({
  providedIn: 'root'
})
export class CustomerNotificationService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(AuthService);
  private initialized = false;

  constructor() {
    this.init();

    // Re-sync FCM token whenever the auth session changes (login / role switch /
    // impersonation return). This fixes the classic "customer never gets pushes"
    // bug: on first launch we receive the token BEFORE the user logs in, so the
    // /users/fcm-token call has no current_user and the backend silently drops
    // it. Re-syncing on every session change guarantees the token lands on the
    // right user row.
    effect(() => {
      const user = this.auth.currentUser();
      if (user) this.syncCachedTokenNow();
    });
  }

  async init() {
    if (!Capacitor.isNativePlatform() || this.initialized) return;
    this.initialized = true;

    try {
      // Create the two customer channels with the SYSTEM DEFAULT notification
      // sound (no custom loud alarm — that's for partner apps only).  We omit
      // the `sound` property so Android uses the phone's own notification
      // sound.  Channels are immutable after creation, so pick IDs we can
      // live with long-term.
      try {
        await LocalNotifications.createChannel({
          id: 'lalganjeats_orders',
          name: 'Order Updates',
          description: 'Order status updates and delivery progress',
          importance: 4, // HIGH — heads-up but not a loud alarm
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#FF0000',
        });
        await LocalNotifications.createChannel({
          id: 'lalganjeats_alerts',
          name: 'Offers & Announcements',
          description: 'Promotions, offers and important announcements from LalganjEats',
          importance: 4,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#FF0000',
        });
      } catch (_) {}

      // 2. Request push permissions (Android 13+: POST_NOTIFICATIONS runtime prompt)
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        console.warn('Customer push notification permission not granted');
        return;
      }

      // 3. Register device with FCM
      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Customer FCM Token registered:', token.value);
        try { localStorage.setItem(TOKEN_CACHE_KEY, token.value); } catch (_) {}
        this.syncTokenWithBackend(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Customer Push registration error:', error);
      });

      // Foreground push: OS won't display a system-tray notification while
      // our app is open, so schedule a local one on the same channel.  No
      // custom sound — the phone's default notification chime plays.
      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Customer push received:', notification);
          try {
            LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 100000),
                  title: notification.title || 'LalganjEats',
                  body: notification.body || '',
                  channelId: 'lalganjeats_alerts',
                  extra: notification.data ?? null,
                },
              ],
            });
          } catch (_) {}
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          const data = action.notification.data;
          if (data && data['deep_link']) {
            this.router.navigateByUrl(data['deep_link']);
          } else if (data && data['order_id']) {
            this.router.navigate(['/profile/orders']);
          }
        }
      );

      // Re-emit cached token to backend on every launch — covers the case
      // where the OS never fires a fresh `registration` event (typical after
      // the first install) but the user is now logged in.
      this.syncCachedTokenNow();
    } catch (e) {
      console.warn('Customer push notifications initialization failed:', e);
    }
  }

  /** Send an already-cached FCM token to backend for the currently logged-in user. */
  syncCachedTokenNow(): void {
    try {
      const cached = localStorage.getItem(TOKEN_CACHE_KEY);
      if (cached) this.syncTokenWithBackend(cached);
    } catch (_) {}
  }

  private syncTokenWithBackend(fcmToken: string) {
    if (!fcmToken || !fcmToken.trim()) return;
    const url = `${environment.apiBaseUrl}/users/fcm-token`;
    this.http.post(url, { fcm_token: fcmToken }).subscribe({
      next: () => console.log('Customer FCM token saved to backend successfully'),
      error: (err) => console.warn('Could not sync customer FCM token with backend', err),
    });
  }
}
