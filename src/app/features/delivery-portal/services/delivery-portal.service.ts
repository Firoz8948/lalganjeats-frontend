import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DpOrder {
  id: number;
  order_number: string;
  status: string;
  restaurant: string | null;
  restaurant_address?: string | null;
  delivery_address: string | null;
  customer_total: number;
  payout: number;
  distance_km_to_restaurant: number | null;
  distance_km_restaurant_to_customer: number | null;
  eta_minutes: number | null;
  map_to_restaurant: string | null;
  map_to_customer: string | null;
  payment_method: string;
  items: { name: string; quantity: number; price: number }[];
  created_at: string | null;
}

export interface DpDashboard {
  profile: {
    is_online: boolean;
    full_name: string;
    phone: string;
    total_earnings: number;
    has_location: boolean;
  };
  today: { orders: number; earnings: number };
  active_order: DpOrder | null;
  available_orders: DpOrder[];
}

@Injectable({ providedIn: 'root' })
export class DeliveryPortalService {
  private api = `${environment.apiBaseUrl}/delivery`;
  private locApi = `${environment.apiBaseUrl}/getlocation`;

  constructor(private http: HttpClient) {}

  dashboard(): Observable<DpDashboard> {
    return this.http.get<DpDashboard>(`${this.api}/dashboard`);
  }

  toggleOnline(): Observable<{ is_online: boolean }> {
    return this.http.patch<{ is_online: boolean }>(`${this.api}/toggle-online`, {});
  }

  accept(orderId: number) {
    return this.http.patch(`${this.api}/orders/${orderId}/accept`, {});
  }

  reject(orderId: number) {
    return this.http.patch(`${this.api}/orders/${orderId}/reject`, {});
  }

  pickedUp(orderId: number) {
    return this.http.patch(`${this.api}/orders/${orderId}/picked-up`, {});
  }

  sendOtp(orderId: number) {
    return this.http.post<{ message: string; dev_otp?: string }>(
      `${this.api}/orders/${orderId}/send-otp`,
      {}
    );
  }

  complete(orderId: number, otp: string, collection_method: 'cash' | 'online') {
    return this.http.post(`${this.api}/orders/${orderId}/complete`, {
      otp,
      collection_method,
    });
  }

  myOrders(filter = 'all') {
    return this.http.get<DpOrder[]>(`${this.api}/orders?filter=${filter}`);
  }

  earnings(filter = 'today') {
    return this.http.get(`${this.api}/earnings?filter=${filter}`);
  }

  pingLocation(lat: number, lng: number) {
    return this.http.post(this.locApi, { latitude: lat, longitude: lng });
  }
}
