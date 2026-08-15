import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Restaurant } from '../models/restaurant.model';

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
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly baseUrl = `${environment.apiBaseUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  getRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.baseUrl);
  }

  getRestaurant(id: number): Observable<Restaurant> {
    return this.http.get<Restaurant>(`${this.baseUrl}/${id}`);
  }

  getRestaurantMenu(id: number): Observable<PublicMenuItem[]> {
    return this.http.get<PublicMenuItem[]>(`${this.baseUrl}/${id}/menu`);
  }
}
