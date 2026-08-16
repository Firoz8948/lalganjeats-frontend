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
  client_channel?: string | null;
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
  distance_km: number | null;
  eta_minutes: number | null;
  online_payment_stub?: { stub: boolean; message: string } | null;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private base = `${environment.apiBaseUrl}/orders`;

  constructor(private http: HttpClient) {}

  placeOrder(payload: PlaceOrderPayload): Observable<PlaceOrderResult> {
    return this.http.post<PlaceOrderResult>(this.base, payload);
  }

  getOrder(id: number): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }
}
