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
import { HistoryPage } from './earnings.service';

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
  is_featured: boolean;
  product_count: number;
}

export interface RestaurantImpersonationSession {
  access_token: string;
  token_type: string;
  role: 'restaurant_owner';
  user_id: number;
  full_name: string | null;
  phone?: string | null;
  restaurant_id: number;
  restaurant_name: string;
  impersonated_by: number;
  impersonation_session_id: string;
  redirect_to: string;
}

export interface DeliveryPartnerImpersonationSession {
  access_token: string;
  token_type: string;
  role: 'delivery_partner';
  user_id: number;
  full_name: string | null;
  phone?: string | null;
  impersonated_by: number;
  impersonation_session_id: string;
  redirect_to: string;
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

  getCatalogSubcategories(
    categoryId: number,
    productSort?: 'asc' | 'desc',
  ): Observable<CatalogSubcategory[]> {
    const sort = productSort ? `&product_sort=${productSort}` : '';
    return this.http.get<CatalogSubcategory[]>(
      `${this.baseUrl}/catalog/subcategories?category_id=${categoryId}${sort}`,
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

  toggleCatalogSubcategoryFeatured(id: number): Observable<CatalogSubcategory> {
    return this.http.patch<CatalogSubcategory>(
      `${this.baseUrl}/catalog/subcategories/${id}/featured`,
      {},
    );
  }

  getDashboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard`);
  }

  getRestaurants(): Observable<AdminRestaurantRow[]> {
    return this.http.get<AdminRestaurantRow[]>(`${this.baseUrl}/restaurants`);
  }

  impersonateRestaurant(id: number): Observable<RestaurantImpersonationSession> {
    return this.http.post<RestaurantImpersonationSession>(
      `${this.baseUrl}/restaurants/${id}/impersonate`,
      {},
    );
  }

  exitImpersonation(): Observable<{ ok: boolean; ended_at: string | null }> {
    return this.http.post<{ ok: boolean; ended_at: string | null }>(
      `${this.baseUrl}/impersonation/exit`,
      {},
    );
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
    purpose:
      | 'list_banner'
      | 'menu_banner'
      | 'menu_banner_mobile'
      | 'menu_item'
      | 'home_banner_desktop'
      | 'home_banner_mobile'
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

  setCustomerStatus(id: number, isActive: boolean): Observable<{ id: number; is_active: boolean }> {
    return this.http.patch<{ id: number; is_active: boolean }>(
      `${this.baseUrl}/customers/${id}/status`,
      { is_active: isActive },
    );
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

  updateMenuItem(
    restaurantId: number,
    itemId: number,
    payload: AdminMenuItemCreate,
  ): Observable<AdminMenuItem> {
    return this.http.put<AdminMenuItem>(
      `${this.baseUrl}/restaurants/${restaurantId}/menu/${itemId}`,
      payload,
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

  createDeliveryException(payload: DeliveryExceptionCreate): Observable<DeliveryException> {
    return this.http.post<DeliveryException>(
      `${this.baseUrl}/delivery-exceptions`,
      payload,
    );
  }

  deleteDeliveryException(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/delivery-exceptions/${id}`,
    );
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  getOrders(status?: string, page = 1): Observable<AdminOrdersPage> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    params.set('page', String(page));
    return this.http.get<AdminOrdersPage>(`${this.baseUrl}/orders?${params.toString()}`);
  }

  getOrderBreakdown(orderId: number): Observable<OrderBreakdown> {
    return this.http.get<OrderBreakdown>(`${this.baseUrl}/orders/${orderId}/breakdown`);
  }

  getPaymentsReceived(): Observable<PaymentsReceivedResponse> {
    return this.http.get<PaymentsReceivedResponse>(`${this.baseUrl}/payments/received`);
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

  impersonateDeliveryPartner(id: number): Observable<DeliveryPartnerImpersonationSession> {
    return this.http.post<DeliveryPartnerImpersonationSession>(
      `${this.baseUrl}/delivery-partners/${id}/impersonate`,
      {},
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

  getRestaurantSettlementHistory(id: number, page = 1) {
    return this.http.get<HistoryPage>(
      `${this.baseUrl}/settlements/restaurants/${id}/history?page=${page}`,
    );
  }

  getDeliverySettlementHistory(id: number, page = 1) {
    return this.http.get<HistoryPage>(
      `${this.baseUrl}/settlements/delivery-partners/${id}/history?page=${page}`,
    );
  }

  getDeliveryCashHistory(id: number, page = 1) {
    return this.http.get<HistoryPage>(
      `${this.baseUrl}/settlements/delivery-partners/${id}/cash-history?page=${page}`,
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
  initial_km: number;
  final_km: number;
  radius_km: number;
  pricing_type: 'flat' | 'per_km';
  rate: number;
  sort_order: number;
  is_active: boolean;
}

export interface DeliveryZoneCreate {
  name: string;
  initial_km: number;
  final_km: number;
  pricing_type: 'flat' | 'per_km';
  rate: number;
  sort_order?: number;
}

export interface DeliveryException {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  delivery_charge: number;
  is_active: boolean;
}

export interface DeliveryExceptionCreate {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  delivery_charge: number;
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
  delivery_exceptions: DeliveryException[];
}

export interface AdminOrdersPage {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  items: AdminOrderRow[];
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
  payment_status?: string;
  payment_mode?: string;
  payment_mode_label?: string;
  payment_verified?: boolean;
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
  /** Customer view */
  display_price?: number;
  order_price: number;
  platform_fee: number;
  delivery_charge: number;
  discount: number;
  customer_total: number;
  payment_method?: string;
  payment_label?: string;
  payment_mode?: string;
  payment_mode_label?: string;
  payment_verified?: boolean;
  payment_via?: string | null;
  payment_status?: string;
  online_amount?: number;
  cash_collected?: number;
  /** Admin view */
  hotel_price: number;
  delivery_price: number;
  admin_profit: number;
  is_loss: boolean;
  platform_charge?: number;
  menu_margin?: number;
  promo_cost?: number;
  promo_code: string | null;
  customer_view?: {
    display_price: number;
    platform_fee: number;
    delivery_charge: number;
    discount: number;
    customer_total: number;
  };
  admin_view?: {
    hotel_payout: number;
    delivery_payout: number;
    admin_profit: number;
    is_loss: boolean;
  };
}

export interface PaymentReceivedRow {
  id: string | number;
  source_type: 'customer' | 'delivery_partner' | string;
  payer_name: string | null;
  via: string | null;
  amount: number;
  method: string;
  label: string;
  order_number: string | null;
  restaurant: string | null;
  order_status: string | null;
  created_at: string | null;
}

export interface PaymentsReceivedResponse {
  total_received: number;
  count: number;
  payments: PaymentReceivedRow[];
}

export interface SettlementRow {
  id: number;
  name: string;
  phone?: string | null;
  is_active?: boolean;
  cash_collected?: number;
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
  discount_type?: 'percent' | 'flat';
  percent_off: number | null;
  flat_off?: number | null;
  min_cart_value?: number | null;
  free_delivery: boolean;
  expires_at: string | null;
  max_uses: number;
  remaining_uses: number;
  used_count: number;
  is_active: boolean;
  is_public: boolean;
  is_expired: boolean;
  audience?: 'all' | 'new_users';
  description: string | null;
  created_at: string | null;
}

export interface PromoCodeCreate {
  code: string;
  channel: 'all' | 'mobile_app';
  audience?: 'all' | 'new_users';
  discount_type?: 'percent' | 'flat';
  percent_off?: number | null;
  flat_off?: number | null;
  min_cart_value?: number | null;
  free_delivery: boolean;
  expires_at?: string | null;
  max_uses: number;
  description?: string | null;
  is_public?: boolean;
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
