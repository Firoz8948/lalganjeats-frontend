import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare const Razorpay: any;

export interface RazorpayOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly base = `${environment.apiBaseUrl}/payment`;

  constructor(private http: HttpClient) {}

  createRazorpayOrder(orderId: number): Observable<RazorpayOrderResponse> {
    return this.http.post<RazorpayOrderResponse>(`${this.base}/create-order`, {
      order_id: orderId,
    });
  }

  verifyPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    order_id: number;
  }): Observable<{ message: string; order_id: number }> {
    return this.http.post<{ message: string; order_id: number }>(
      `${this.base}/verify`,
      data
    );
  }

  openRazorpayCheckout(
    orderResponse: RazorpayOrderResponse,
    userPhone: string,
    userName: string,
    orderId: number,
    onSuccess: (data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      order_id: number;
    }) => void,
    onFailure: () => void
  ): void {
    const options = {
      key: orderResponse.key_id,
      amount: Math.round(orderResponse.amount * 100),
      currency: orderResponse.currency,
      name: 'LalganjEats',
      description: 'Food Order Payment',
      order_id: orderResponse.razorpay_order_id,
      prefill: {
        name: userName,
        contact: userPhone,
      },
      theme: { color: '#ff0000' },
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        onSuccess({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          order_id: orderId,
        });
      },
      modal: {
        ondismiss: () => onFailure(),
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}
