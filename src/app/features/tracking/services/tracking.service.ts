import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackSnapshot {
  available: boolean;
  message: string | null;
  order_id: number;
  order_number: string | null;
  order_status: string | null;
  phase: 'to_restaurant' | 'to_customer' | 'delivered' | null;
  rider: LatLng | null;
  destination: LatLng | null;
  restaurant: LatLng | null;
  customer: LatLng | null;
  eta_minutes: number | null;
  distance_km: number | null;
  eta_label: string | null;
  updated_at: string | null;
  delivery_partner_id: number | null;
  delivery_partner: {
    name: string;
    selfie_url: string | null;
    registered_vehicle_number: string | null;
    bike_info: string | null;
  } | null;
  google_maps_api_key: string | null;
}

export interface TrackingPublicConfig {
  google_maps_api_key: string | null;
  maps_enabled: boolean;
  app_name: string;
  track_poll_seconds: number;
}

@Injectable({ providedIn: 'root' })
export class TrackingService {
  private base = `${environment.apiBaseUrl}/tracking`;

  constructor(private http: HttpClient) {}

  publicConfig(): Observable<TrackingPublicConfig> {
    return this.http.get<TrackingPublicConfig>(`${this.base}/config`);
  }

  trackOrder(orderId: number): Observable<TrackSnapshot> {
    return this.http.get<TrackSnapshot>(`${this.base}/orders/${orderId}`);
  }
}
