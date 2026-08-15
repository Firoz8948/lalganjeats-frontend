import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminRestaurantRow,
  Restaurant,
  RestaurantCreatePayload,
  RestaurantUpdatePayload,
} from '../models/restaurant.model';
import { HomeBannerSlide } from './banner.service';

export interface AdminMenuVariant {
  id?: number;
  label: string;
  price?: number;
  actual_price: number;
  original_price?: number | null;
  is_available?: boolean;
}

export interface AdminMenuItem {
  id:             number;
  name:           string;
  description:    string;
  price:          number;
  actual_price:   number;
  original_price: number | null;
  category:       string;
  category_id:    number | null;
  subcategory_id?: number | null;
  subcategory?:   string | null;
  is_veg:         boolean;
  is_bestseller:  boolean;
  is_available:   boolean;
  image_url?:     string | null;
  variants?:      AdminMenuVariant[];
}

export interface AdminMenuItemCreate {
  name:           string;
  description?:   string;
  image_url?:     string | null;
  price:          number;
  actual_price:   number;
  original_price?: number | null;
  category_name:  string;
  subcategory_id?: number | null;
  is_veg:         boolean;
  is_bestseller:  boolean;
  variants?:      { label: string; actual_price: number; original_price?: number | null }[];
}

export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface CatalogSubcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  constructor(private http: HttpClient) {}

  getCatalogCategories(): Observable<CatalogCategory[]> {
    return this.http.get<CatalogCategory[]>(`${this.baseUrl}/catalog/categories`);
  }

  createCatalogCategory(name: string): Observable<CatalogCategory> {
    return this.http.post<CatalogCategory>(
      `${this.baseUrl}/catalog/categories`,
      { name },
    );
  }

  toggleCatalogCategory(id: number): Observable<CatalogCategory> {
    return this.http.patch<CatalogCategory>(
      `${this.baseUrl}/catalog/categories/${id}/toggle`,
      {},
    );
  }

  getCatalogSubcategories(categoryId: number): Observable<CatalogSubcategory[]> {
    return this.http.get<CatalogSubcategory[]>(
      `${this.baseUrl}/catalog/subcategories?category_id=${categoryId}`,
    );
  }

  createCatalogSubcategory(
    categoryId: number,
    name: string,
  ): Observable<CatalogSubcategory> {
    return this.http.post<CatalogSubcategory>(
      `${this.baseUrl}/catalog/subcategories?category_id=${categoryId}`,
      { name },
    );
  }

  toggleCatalogSubcategory(id: number): Observable<CatalogSubcategory> {
    return this.http.patch<CatalogSubcategory>(
      `${this.baseUrl}/catalog/subcategories/${id}/toggle`,
      {},
    );
  }

  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`);
  }

  getRestaurants(): Observable<AdminRestaurantRow[]> {
    return this.http.get<AdminRestaurantRow[]>(`${this.baseUrl}/restaurants`);
  }

  createRestaurant(payload: RestaurantCreatePayload): Observable<Restaurant> {
    return this.http.post<Restaurant>(`${this.baseUrl}/restaurants`, payload);
  }

  updateRestaurant(
    id: number,
    payload: RestaurantUpdatePayload,
  ): Observable<AdminRestaurantRow> {
    return this.http.patch<AdminRestaurantRow>(
      `${this.baseUrl}/restaurants/${id}`,
      payload,
    );
  }

  approveRestaurant(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.baseUrl}/restaurants/${id}/approve`,
      {}
    );
  }

  /** Upload banner image — local storage now, S3 later */
  uploadBanner(
    file: File,
    purpose: 'list_banner' | 'menu_banner' | 'menu_item' | 'home_banner_desktop' | 'home_banner_mobile'
  ): Observable<{ url: string; path: string; purpose: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    return this.http.post<{ url: string; path: string; purpose: string }>(
      `${this.baseUrl}/upload`,
      form
    );
  }

  getCustomers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/customers`);
  }

  // ── Menu management (admin impersonation) ─────────────────────────────────

  getRestaurantMenu(restaurantId: number): Observable<AdminMenuItem[]> {
    return this.http.get<AdminMenuItem[]>(
      `${this.baseUrl}/restaurants/${restaurantId}/menu`
    );
  }

  addMenuItem(restaurantId: number, payload: AdminMenuItemCreate): Observable<AdminMenuItem> {
    return this.http.post<AdminMenuItem>(
      `${this.baseUrl}/restaurants/${restaurantId}/menu`,
      payload
    );
  }

  deleteMenuItem(restaurantId: number, itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/restaurants/${restaurantId}/menu/${itemId}`
    );
  }

  toggleMenuItem(restaurantId: number, itemId: number): Observable<{ id: number; is_available: boolean }> {
    return this.http.patch<{ id: number; is_available: boolean }>(
      `${this.baseUrl}/restaurants/${restaurantId}/menu/${itemId}`,
      {}
    );
  }

  setRestaurantBanner(restaurantId: number, bannerUrl: string): Observable<any> {
    return this.http.patch(
      `${this.baseUrl}/restaurants/${restaurantId}/banner`,
      { banner_url: bannerUrl }
    );
  }

  // ── Home page carousel banners ───────────────────────────────────────────

  getHomeBanners(): Observable<HomeBannerSlide[]> {
    return this.http.get<HomeBannerSlide[]>(`${this.baseUrl}/home-banners`);
  }

  createHomeBanner(): Observable<HomeBannerSlide> {
    return this.http.post<HomeBannerSlide>(`${this.baseUrl}/home-banners`, {});
  }

  patchHomeBanner(
    id: number,
    payload: Partial<Pick<HomeBannerSlide, 'desktop_image_url' | 'mobile_image_url' | 'is_active'>>,
  ): Observable<HomeBannerSlide> {
    return this.http.patch<HomeBannerSlide>(`${this.baseUrl}/home-banners/${id}`, payload);
  }

  deleteHomeBanner(id: number): Observable<{ message: string; slides: HomeBannerSlide[] }> {
    return this.http.delete<{ message: string; slides: HomeBannerSlide[] }>(
      `${this.baseUrl}/home-banners/${id}`,
    );
  }

  saveHomeBanners(slides: HomeBannerSlide[]): Observable<HomeBannerSlide[]> {
    return this.http.put<HomeBannerSlide[]>(`${this.baseUrl}/home-banners`, { slides });
  }

  // ── Tenant centre + delivery zones ───────────────────────────────────────

  getTenant(): Observable<TenantCentre> {
    return this.http.get<TenantCentre>(`${this.baseUrl}/tenant`);
  }

  getZones(): Observable<DeliveryZone[]> {
    return this.http.get<DeliveryZone[]>(`${this.baseUrl}/zones`);
  }

  createZone(payload: DeliveryZoneCreate): Observable<DeliveryZone> {
    return this.http.post<DeliveryZone>(`${this.baseUrl}/zones`, payload);
  }

  updateZone(id: number, payload: Partial<DeliveryZoneCreate & { is_active: boolean }>): Observable<DeliveryZone> {
    return this.http.patch<DeliveryZone>(`${this.baseUrl}/zones/${id}`, payload);
  }

  deleteZone(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/zones/${id}`);
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  getOrders(): Observable<AdminOrderRow[]> {
    return this.http.get<AdminOrderRow[]>(`${this.baseUrl}/orders`);
  }

  getOrderBreakdown(orderId: number): Observable<OrderBreakdown> {
    return this.http.get<OrderBreakdown>(`${this.baseUrl}/orders/${orderId}/breakdown`);
  }

  // ── Partner settlements ──────────────────────────────────────────────────

  getRestaurantSettlements(): Observable<SettlementRow[]> {
    return this.http.get<SettlementRow[]>(
      `${this.baseUrl}/settlements/restaurants`,
    );
  }

  getDeliverySettlements(): Observable<SettlementRow[]> {
    return this.http.get<SettlementRow[]>(
      `${this.baseUrl}/settlements/delivery-partners`,
    );
  }

  settleRestaurant(id: number): Observable<SettlementResult> {
    return this.http.post<SettlementResult>(
      `${this.baseUrl}/settlements/restaurants/${id}/settle`,
      {},
    );
  }

  settleDeliveryPartner(id: number): Observable<SettlementResult> {
    return this.http.post<SettlementResult>(
      `${this.baseUrl}/settlements/delivery-partners/${id}/settle`,
      {},
    );
  }

  // ── Promocodes ───────────────────────────────────────────────────────────

  getPromos(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(`${this.baseUrl}/promocodes`);
  }

  createPromo(payload: PromoCodeCreate): Observable<PromoCode> {
    return this.http.post<PromoCode>(`${this.baseUrl}/promocodes`, payload);
  }

  updatePromo(id: number, payload: Partial<PromoCodeCreate & { is_active: boolean }>): Observable<PromoCode> {
    return this.http.patch<PromoCode>(`${this.baseUrl}/promocodes/${id}`, payload);
  }

  deletePromo(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/promocodes/${id}`);
  }

  getPromoUsages(id: number): Observable<PromoUsage[]> {
    return this.http.get<PromoUsage[]>(`${this.baseUrl}/promocodes/${id}/usages`);
  }
}

export interface DeliveryZone {
  id: number;
  name: string;
  radius_km: number;
  pricing_type: 'flat' | 'per_km';
  rate: number;
  sort_order: number;
  is_active: boolean;
}

export interface DeliveryZoneCreate {
  name: string;
  radius_km: number;
  pricing_type: 'flat' | 'per_km';
  rate: number;
  sort_order?: number;
}

export interface TenantCentre {
  id: number;
  name: string;
  slug: string;
  center_latitude: number;
  center_longitude: number;
  center_address: string;
  platform_charge_percent: number;
  zones: DeliveryZone[];
}

export interface AdminOrderRow {
  id: number;
  order_number: string;
  customer: string | null;
  restaurant: string | null;
  status: string;
  total_amount: number;
  discount: number;
  payment_method: string;
  promo_code: string | null;
  promo_percent_off: number | null;
  promo_free_delivery: boolean;
  admin_earning: number;
  created_at: string | null;
}

export interface OrderBreakdown {
  order_id: number;
  order_number: string;
  restaurant: string | null;
  customer: string | null;
  status: string;
  order_price: number;
  delivery_charge: number;
  customer_total: number;
  hotel_price: number;
  delivery_price: number;
  platform_fee: number;
  platform_charge: number;
  admin_profit: number;
  is_loss: boolean;
  discount: number;
  promo_code: string | null;
}

export interface SettlementRow {
  id: number;
  name: string;
  phone?: string | null;
  unsettled_amount: number;
  unsettled_orders: number;
  settled_amount_lifetime: number;
}

export interface SettlementResult {
  settled_amount: number;
  settled_orders: number;
}

export interface PromoCode {
  id: number;
  code: string;
  channel: 'all' | 'mobile_app';
  percent_off: number | null;
  free_delivery: boolean;
  expires_at: string | null;
  max_uses: number;
  remaining_uses: number;
  used_count: number;
  is_active: boolean;
  is_expired: boolean;
  description: string | null;
  created_at: string | null;
}

export interface PromoCodeCreate {
  code: string;
  channel: 'all' | 'mobile_app';
  percent_off?: number | null;
  free_delivery: boolean;
  expires_at?: string | null;
  max_uses: number;
  description?: string | null;
}

export interface PromoUsage {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  restaurant_name: string | null;
  discount_amount: number;
  percent_off_snapshot: number | null;
  free_delivery_applied: boolean;
  client_channel: string;
  created_at: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}
