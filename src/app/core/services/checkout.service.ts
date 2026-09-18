import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare const Razorpay: new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: string, handler: (resp: unknown) => void) => void;
};

export interface RazorpayCheckoutSession {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  checkout_config_id?: string | null;
  name?: string;
  description?: string;
  order_id?: number;
  order_number?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_id: number;
}

export interface RazorpayVerifyResponse {
  message: string;
  order_id: number;
  order_number?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly base = `${environment.apiBaseUrl}/payment`;
  private sdkLoading: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  createRazorpayOrder(orderId: number): Observable<RazorpayCheckoutSession> {
    return this.http.post<RazorpayCheckoutSession>(`${this.base}/create-order`, {
      order_id: orderId,
    });
  }

  verifyRazorpay(payload: RazorpayVerifyPayload): Observable<RazorpayVerifyResponse> {
    return this.http.post<RazorpayVerifyResponse>(`${this.base}/verify`, payload);
  }

  /** Ensure checkout.js is present (needed after OTA / flaky WebView loads). */
  ensureRazorpaySdk(): Promise<void> {
    if (typeof Razorpay !== 'undefined') {
      return Promise.resolve();
    }
    if (this.sdkLoading) {
      return this.sdkLoading;
    }
    this.sdkLoading = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-razorpay-checkout]',
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Razorpay SDK failed to load')),
          { once: true },
        );
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset['razorpayCheckout'] = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
      document.head.appendChild(script);
    }).finally(() => {
      this.sdkLoading = null;
    });
    return this.sdkLoading;
  }

  /** Opens Razorpay Standard Checkout overlay (browser + Capacitor WebView). */
  async openRazorpayCheckout(
    session: RazorpayCheckoutSession,
    onSuccess: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => void,
    onDismiss: () => void,
  ): Promise<void> {
    await this.ensureRazorpaySdk();
    if (typeof Razorpay === 'undefined') {
      throw new Error('Razorpay SDK failed to load');
    }

    const options: Record<string, unknown> = {
      key: session.key_id,
      amount: Math.round(Number(session.amount) * 100),
      currency: session.currency || 'INR',
      name: session.name || 'LalganjEats',
      description: session.description || 'Order payment',
      order_id: session.razorpay_order_id,
      prefill: session.prefill || {},
      theme: { color: '#c41e3a' },
      // Required so Razorpay shows UPI inside Android WebView / Capacitor APK.
      webview_intent: true,
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => onSuccess(response),
      modal: {
        ondismiss: () => onDismiss(),
        escape: true,
        confirm_close: true,
      },
    };

    // Only attach config when present; invalid IDs break checkout.
    if (session.checkout_config_id) {
      options['config'] = { checkout_config_id: session.checkout_config_id };
    }

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', () => onDismiss());
    rzp.open();
  }
}
