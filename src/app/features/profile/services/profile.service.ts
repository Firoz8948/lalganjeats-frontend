// frontend/src/app/features/profile/services/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CustomerProfile {
  id:            number;
  phone:         string;
  full_name:     string;
  email:         string | null;
  gender:        string | null;
  date_of_birth: string | null;
  profile_image: string | null;
  created_at:    string;
}

export interface Address {
  id:           number;
  label:        string;
  full_address: string;
  landmark:     string | null;
  city:         string;
  pincode:      string | null;
  is_default:   boolean;
}

export interface CustomerSettings {
  notif_order_updates: boolean;
  notif_offers:        boolean;
  notif_sms:           boolean;
  preferred_language:  string;
  preferred_payment:   string;
}

export interface CustomerOrder {
  id:              number;
  order_number:    string;
  restaurant_id:   number;
  restaurant_name: string;
  status:          string;
  status_meta?:    string;
  payment_method:  string;
  payment_status:  string;
  subtotal:        number;
  delivery_fee:    number;
  packing_charge?: number;
  total_amount:    number;
  delivery_partner: DeliveryPartnerIdentity | null;
  delivery_otp?:   string | null;
  items:           OrderItem[];
  created_at:      string;
}

export interface DeliveryPartnerIdentity {
  name: string;
  selfie_url: string | null;
  registered_vehicle_number: string | null;
  bike_info: string | null;
}

export interface OrderItem {
  name:     string;
  price:    number;
  quantity: number;
  subtotal: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private api = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient) {}

  // Profile
  getProfile(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>(`${this.api}/profile`);
  }

  updateProfile(data: Partial<CustomerProfile>): Observable<any> {
    return this.http.put(`${this.api}/profile`, data);
  }

  // Addresses
  getAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.api}/addresses`);
  }

  addAddress(data: Partial<Address>): Observable<any> {
    return this.http.post(`${this.api}/addresses`, data);
  }

  updateAddress(id: number, data: Partial<Address>): Observable<any> {
    return this.http.put(`${this.api}/addresses/${id}`, data);
  }

  deleteAddress(id: number): Observable<any> {
    return this.http.delete(`${this.api}/addresses/${id}`);
  }

  setDefaultAddress(id: number): Observable<any> {
    return this.http.patch(`${this.api}/addresses/${id}/set-default`, {});
  }

  // Orders
  getOrders(filter: string = 'all'): Observable<CustomerOrder[]> {
    return this.http.get<CustomerOrder[]>(
      `${this.api}/orders?filter=${filter}`
    );
  }

  // Settings
  getSettings(): Observable<CustomerSettings> {
    return this.http.get<CustomerSettings>(`${this.api}/settings`);
  }

  updateSettings(data: Partial<CustomerSettings>): Observable<any> {
    return this.http.put(`${this.api}/settings`, data);
  }
}
