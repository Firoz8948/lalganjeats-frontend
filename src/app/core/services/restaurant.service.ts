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

export interface FeaturedSubcategory {
  id: number;
  category_id?: number;
  name: string;
  slug: string;
  image_url?: string | null;
  is_featured?: boolean;
  product_count: number;
  restaurant_count: number;
}

export interface DishSearchRestaurant extends Restaurant {
  matched_items?: string[];
}

export interface CatalogProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  /** Variant a one-tap "Buy" adds to the cart (cheapest available); null when the item has none. */
  variant_id: number | null;
  variant_label: string | null;
  /** Menu category name, stored on the cart line. */
  category: string;
  image_url: string | null;
  is_veg: boolean;
  subcategory: string | null;
  subcategory_id: number | null;
  restaurant: {
    id: number;
    slug: string | null;
    name: string;
    business_category_id: number | null;
    is_open: boolean;
    opens_at_label: string | null;
  };
}

export interface ProductSearchResult extends CatalogProduct {
  score: number;
}

/** Admin-curated product row on a home tab (Grocery Panel). */
export interface ProductShelf {
  id: number;
  title: string;
  sort_order: number;
  section_bg_color: string;
  image_bg_color: string;
  card_bg_color: string;
  view_all_subcategory_id: number | null;
  products: CatalogProduct[];
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly baseUrl = `${environment.apiBaseUrl}/restaurants`;

  constructor(private http: HttpClient) {}

  getRestaurants(
    lat?: number | null,
    lng?: number | null,
    subcategoryId?: number | null,
  ): Observable<Restaurant[]> {
    let params = new HttpParams();
    if (lat != null && lng != null) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    if (subcategoryId != null) {
      params = params.set('subcategory_id', String(subcategoryId));
    }
    return this.http.get<Restaurant[]>(this.baseUrl, { params });
  }

  getFeaturedSubcategories(categoryId: number): Observable<FeaturedSubcategory[]> {
    return this.http.get<FeaturedSubcategory[]>(
      `${this.baseUrl}/subcategories/featured`,
      { params: { category_id: categoryId } },
    );
  }

  /** Every active subcategory of a business category, featured first. */
  getCategorySubcategories(categoryId: number): Observable<FeaturedSubcategory[]> {
    return this.http.get<FeaturedSubcategory[]>(
      `${this.baseUrl}/categories/${categoryId}/subcategories`,
    );
  }

  /** Products of one subcategory from stores that deliver to the customer. */
  getShelves(categoryId: number, lat: number, lng: number): Observable<ProductShelf[]> {
    const params = new HttpParams()
      .set('category_id', String(categoryId))
      .set('lat', String(lat))
      .set('lng', String(lng));
    return this.http.get<ProductShelf[]>(`${environment.apiBaseUrl}/shelves`, { params });
  }

  /** Products of one subcategory, or of the whole category when only `categoryId` is given. */
  getCatalogProducts(
    scope: { subcategoryId: number } | { categoryId: number },
    lat: number,
    lng: number,
  ): Observable<CatalogProduct[]> {
    let params = new HttpParams().set('lat', String(lat)).set('lng', String(lng));
    params = 'subcategoryId' in scope
      ? params.set('subcategory_id', String(scope.subcategoryId))
      : params.set('category_id', String(scope.categoryId));
    return this.http.get<CatalogProduct[]>(`${this.baseUrl}/products`, { params });
  }

  getRestaurant(
    key: string | number,
    lat?: number | null,
    lng?: number | null,
  ): Observable<Restaurant> {
    let params = new HttpParams();
    if (lat != null && lng != null) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    return this.http.get<Restaurant>(`${this.baseUrl}/${key}`, { params });
  }

  getRestaurantMenu(key: string | number): Observable<PublicMenuItem[]> {
    return this.http.get<PublicMenuItem[]>(`${this.baseUrl}/${key}/menu`);
  }

  /** Restaurants in delivery area that sell a matching dish. */
  searchByDish(
    q: string,
    lat?: number | null,
    lng?: number | null,
  ): Observable<DishSearchRestaurant[]> {
    let params = new HttpParams().set('q', q.trim());
    if (lat != null && lng != null) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    return this.http.get<DishSearchRestaurant[]>(`${this.baseUrl}/search`, { params });
  }

  /** Products from deliverable stores of one category, best keyword match first. */
  searchProducts(
    q: string,
    categoryId: number,
    lat: number,
    lng: number,
    limit: number,
  ): Observable<ProductSearchResult[]> {
    const params = new HttpParams()
      .set('q', q.trim())
      .set('category_id', String(categoryId))
      .set('lat', String(lat))
      .set('lng', String(lng))
      .set('limit', String(limit));
    return this.http.get<ProductSearchResult[]>(`${this.baseUrl}/products/search`, { params });
  }
}
