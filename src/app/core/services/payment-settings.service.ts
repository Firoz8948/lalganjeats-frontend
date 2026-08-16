import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentSettings {
  id: number;
  delivery_charge: number;
  free_delivery_above: number;
  delivery_boy_per_order_earning: number;
  platform_fee_percent: number;
  platform_charge_rupees: number;
  display_price_markup_percent: number;
  allow_prepaid_orders: boolean;
  allow_cod_orders: boolean;
  cod_max_order_amount: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentSettingsService {
  private readonly base = `${environment.apiBaseUrl}/payment`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<PaymentSettings> {
    return this.http.get<PaymentSettings>(`${this.base}/settings`);
  }

  getPublicSettings(): Observable<PaymentSettings> {
    return this.http.get<PaymentSettings>(`${this.base}/settings/public`);
  }

  updateSettings(data: Partial<PaymentSettings>): Observable<PaymentSettings> {
    return this.http.put<PaymentSettings>(`${this.base}/settings`, data);
  }
}
