import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Restaurant } from '../models/restaurant.model';

export interface PublicMenuVariant {
  id: number;
  label: string;
  price: number;
  original_price: number | null;
  is_available: boolean;
}

export interface PublicMenuItem {
  id:             number;
  name:           string;
  description:    string;
  price:          number;
  original_price: number | null;
  category:       string;
  category_id:    number | null;
  is_veg:         boolean;
  is_bestseller:  boolean;
  is_available:   boolean;
  image_url:      string | null;
  variants?:      PublicMenuVariant[];
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly baseUrl = `${environment.apiBaseUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  getRestaurants(lat?: number | null, lng?: number | null): Observable<Restaurant[]> {
    let params = new HttpParams();
    if (lat != null && lng != null) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    return this.http.get<Restaurant[]>(this.baseUrl, { params });
  }

  getRestaurant(
    id: number,
    lat?: number | null,
    lng?: number | null,
  ): Observable<Restaurant> {
    let params = new HttpParams();
    if (lat != null && lng != null) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    return this.http.get<Restaurant>(`${this.baseUrl}/${id}`, { params });
  }

  getRestaurantMenu(id: number): Observable<PublicMenuItem[]> {
    return this.http.get<PublicMenuItem[]>(`${this.baseUrl}/${id}/menu`);
  }
}
