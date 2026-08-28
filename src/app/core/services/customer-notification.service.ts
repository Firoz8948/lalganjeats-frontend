import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerNotificationService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private initialized = false;

  constructor() {
    this.init();
  }

  async init() {
    if (!Capacitor.isNativePlatform() || this.initialized) return;
    this.initialized = true;

    try {
      // 1. Create notification channel
      try {
        await LocalNotifications.createChannel({
          id: 'lalganjeats_orders',
          name: 'LalganjEats Order & Promo Alerts',
          description: 'Updates about your delicious food orders and exclusive offers',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#FF0000',
        });
      } catch (_) {}

      // 2. Request Push permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        console.warn('Customer push notification permission not granted');
        return;
      }

      // 3. Register device with Firebase
      await PushNotifications.register();

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Customer FCM Token registered:', token.value);
        this.syncTokenWithBackend(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Customer Push registration error:', error);
      });

      PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          console.log('Customer Push received:', notification);
        }
      );

      PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          const data = action.notification.data;
          if (data && data.deep_link) {
            this.router.navigateByUrl(data.deep_link);
          } else if (data && data.order_id) {
            this.router.navigate(['/profile/orders']);
          }
        }
      );
    } catch (e) {
      console.warn('Customer push notifications initialization failed:', e);
    }
  }

  syncTokenWithBackend(fcmToken: string) {
    const url = `${environment.apiBaseUrl}/users/fcm-token`;
    this.http.post(url, { fcm_token: fcmToken }).subscribe({
      next: () => console.log('Customer FCM token saved to backend successfully'),
      error: (err) => console.warn('Could not sync customer FCM token with backend', err)
    });
  }
}
