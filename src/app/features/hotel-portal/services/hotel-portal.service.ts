// features/hotel-portal/services/hotel-portal.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Restaurant {
  id:          number;
  name:        string;
  is_open:     boolean;
  is_approved: boolean;
  phone:       string;
  address:     string;
}

export interface DashboardData {
  restaurant:    Restaurant;
  stats: {
    total_orders:   number;
    pending_orders: number;
    active_orders:  number;
    total_revenue:  number;
  };
  recent_orders: Order[];
}

export interface Order {
  id:             number;
  order_number:   string;
  status:         string;
  total_amount:   number;
  payment_method: string;
  customer:       string;
  items:          OrderItem[];
  delivery_address?: string;
  delivery_partner?: {
    name: string;
    selfie_url: string | null;
    registered_vehicle_number: string | null;
    bike_info: string | null;
  } | null;
  created_at:     string;
}

export interface OrderItem {
  name:     string;
  quantity: number;
  price:    number;
}

export interface MenuItem {
  id:             number;
  name:           string;
  description:    string;
  price:          number;
  actual_price?:  number | null;
  original_price: number | null;
  is_veg:         boolean;
  is_available:   boolean;
  is_bestseller:  boolean;
  category_id:    number | null;
  image_url:      string | null;
}

export interface MenuCategory {
  id:   number;
  name: string;
}

export interface EarningsData {
  filter:       string;
  total_orders: number;
  total_earned: number;
  orders:       EarningOrder[];
}

export interface EarningOrder {
  id:           number;
  order_number: string;
  customer:     string;
  total_amount: number;
  delivered_at: string;
}

@Injectable({ providedIn: 'root' })
export class HotelPortalService {

  private api = `${environment.apiBaseUrl}/hotel-portal`;

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.api}/dashboard`);
  }

  // Shop toggle
  toggleShopStatus(): Observable<{ is_open: boolean }> {
    return this.http.patch<{ is_open: boolean }>(
      `${this.api}/toggle-status`, {}
    );
  }

  // Orders
  getOrders(status?: string): Observable<Order[]> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<Order[]>(`${this.api}/orders${q}`);
  }

  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.api}/orders/${id}/status`, { status });
  }

  // Menu
  getMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.api}/menu`);
  }

  getCategories(): Observable<MenuCategory[]> {
    return this.http.get<MenuCategory[]>(`${this.api}/categories`);
  }

  addMenuItem(data: any): Observable<any> {
    return this.http.post(`${this.api}/menu`, data);
  }

  updateMenuItem(id: number, data: any): Observable<any> {
    return this.http.put(`${this.api}/menu/${id}`, data);
  }

  deleteMenuItem(id: number): Observable<any> {
    return this.http.delete(`${this.api}/menu/${id}`);
  }

  toggleAvailability(id: number): Observable<any> {
    return this.http.patch(
      `${this.api}/menu/${id}/toggle-availability`, {}
    );
  }

  // Earnings
  getEarnings(filter: string): Observable<EarningsData> {
    return this.http.get<EarningsData>(
      `${this.api}/earnings?filter=${filter}`
    );
  }

  // Settings
  getSettings(): Observable<any> {
    return this.http.get(`${this.api}/settings`);
  }

  updateSettings(data: any): Observable<any> {
    return this.http.put(`${this.api}/settings`, data);
  }
}
