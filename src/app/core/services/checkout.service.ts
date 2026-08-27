import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PayUInitiateResponse {
  payment_url: string;
  fields: Record<string, string>;
  order_id: number;
  order_number: string;
  amount: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly base = `${environment.apiBaseUrl}/payment`;

  constructor(private http: HttpClient) {}

  initiatePayU(orderId: number): Observable<PayUInitiateResponse> {
    return this.http.post<PayUInitiateResponse>(`${this.base}/payu/initiate`, {
      order_id: orderId,
    });
  }

  /** Auto-submit a hidden form to PayU hosted checkout. */
  redirectToPayU(paymentUrl: string, fields: Record<string, string>): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;
    form.style.display = 'none';
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value ?? '';
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }
}
