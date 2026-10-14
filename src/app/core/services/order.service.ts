import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PlaceOrderItem {
  menu_item_id: number;
  quantity: number;
  variant_id?: number | null;
}

export interface PlaceOrderPayload {
  restaurant_id: number;
  address_id?: number | null;
  delivery_address?: string | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  payment_method: 'cash' | 'online';
  notes?: string | null;
  promo_code?: string | null;
  customer_name?: string | null;
  client_channel?: string | null;
  device_id?: string | null;
  items: PlaceOrderItem[];
}

export interface PlaceOrderResult {
  id: number;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  delivery_fee: number;
  discount: number;
  platform_charge?: number;
  packing_charge?: number;
  distance_km: number | null;
  eta_minutes: number | null;
  online_payment_stub?: { stub: boolean; message: string } | null;
  needs_payment?: boolean;
}

/** Grocery cart spanning several stores: one payment, one rider. */
export interface PlaceMultiStorePayload extends Omit<PlaceOrderPayload, 'restaurant_id' | 'items'> {
  stores: { restaurant_id: number; items: PlaceOrderItem[] }[];
}

export interface MultiStoreStoreSummary {
  restaurant_id: number;
  restaurant_name: string;
  order_id: number | null;
  order_number: string | null;
  item_count: number;
  subtotal: number;
  packing_charge: number;
}

export interface MultiStoreQuote {
  subtotal: number;
  delivery_fee: number;
  platform_charge: number;
  packing_charge: number;
  discount: number;
  total_amount: number;
  distance_km: number | null;
  eta_minutes: number | null;
  stores: MultiStoreStoreSummary[];
}

export interface MultiStoreConfig {
  enabled: boolean;
  max_stores: number;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private base = `${environment.apiBaseUrl}/orders`;

  constructor(private http: HttpClient) {}

  placeOrder(payload: PlaceOrderPayload): Observable<PlaceOrderResult> {
    return this.http.post<PlaceOrderResult>(this.base, payload);
  }

  multiStoreConfig(): Observable<MultiStoreConfig> {
    return this.http.get<MultiStoreConfig>(`${this.base}/multi-store/config`);
  }

  quoteMultiStore(payload: PlaceMultiStorePayload): Observable<MultiStoreQuote> {
    return this.http.post<MultiStoreQuote>(`${this.base}/multi-store/quote`, payload);
  }

  placeMultiStoreOrder(
    payload: PlaceMultiStorePayload,
  ): Observable<PlaceOrderResult & { stores: MultiStoreStoreSummary[] }> {
    return this.http.post<PlaceOrderResult & { stores: MultiStoreStoreSummary[] }>(
      `${this.base}/multi-store`,
      payload,
    );
  }

  getOrder(id: number): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }
}
