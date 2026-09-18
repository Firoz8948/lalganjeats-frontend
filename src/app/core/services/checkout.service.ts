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

  constructor(private http: HttpClient) {}

  createRazorpayOrder(orderId: number): Observable<RazorpayCheckoutSession> {
    return this.http.post<RazorpayCheckoutSession>(`${this.base}/create-order`, {
      order_id: orderId,
    });
  }

  verifyRazorpay(payload: RazorpayVerifyPayload): Observable<RazorpayVerifyResponse> {
    return this.http.post<RazorpayVerifyResponse>(`${this.base}/verify`, payload);
  }

  /** Opens Razorpay Standard Checkout overlay (works in browser + Capacitor WebView). */
  openRazorpayCheckout(
    session: RazorpayCheckoutSession,
    onSuccess: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => void,
    onDismiss: () => void,
  ): void {
    if (typeof Razorpay === 'undefined') {
      onDismiss();
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

    if (session.checkout_config_id) {
      options['config'] = { checkout_config_id: session.checkout_config_id };
    }

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', () => onDismiss());
    rzp.open();
  }
}
