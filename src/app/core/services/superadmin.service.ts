import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from './auth.service';

export interface TenantListItem {
  id: number;
  name: string;
  slug: string;
  admin_email: string | null;
  center_address: string;
  center_latitude?: number | null;
  center_longitude?: number | null;
  one_time_fee: number;
  platform_charge_percent: number;
  bank_account_number?: string | null;
  is_active: boolean;
  restaurant_count: number;
  zone_count: number;
}

export interface TenantBankFields {
  bank_account_holder_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  bank_name?: string | null;
}

export interface TenantCreatePayload extends TenantBankFields {
  name: string;
  slug?: string;
  admin_email: string;
  admin_password: string;
  admin_full_name?: string;
  center_latitude: number;
  center_longitude: number;
  center_address: string;
  one_time_fee: number;
  platform_charge_percent: number;
}

export interface TenantUpdatePayload extends TenantBankFields {
  name?: string;
  center_latitude?: number;
  center_longitude?: number;
  center_address?: string;
  one_time_fee?: number;
  platform_charge_percent?: number;
  is_active?: boolean;
  admin_email?: string;
  admin_full_name?: string;
  admin_password?: string;
}

export interface TenantDetail extends TenantBankFields {
  id: number;
  name: string;
  slug: string;
  admin_user_id: number | null;
  admin_email: string | null;
  admin_full_name: string | null;
  center_latitude: number;
  center_longitude: number;
  center_address: string;
  one_time_fee: number;
  platform_charge_percent: number;
  is_active: boolean;
  restaurant_count: number;
  zones: Array<{
    id: number;
    name: string;
    initial_km?: number;
    final_km?: number;
    radius_km: number;
    pricing_type: string;
    rate: number;
    sort_order: number;
    is_active: boolean;
  }>;
}

export interface ImpersonateResult extends AuthUser {
  tenant_id: number;
  tenant_name: string;
  impersonated_by: number;
}

@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private readonly baseUrl = `${environment.apiBaseUrl}/superadmin`;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<{
    stats: {
      total_tenants: number;
      active_tenants: number;
      total_restaurants: number;
    };
    tenants: TenantListItem[];
  }> {
    return this.http.get<{
      stats: {
        total_tenants: number;
        active_tenants: number;
        total_restaurants: number;
      };
      tenants: TenantListItem[];
    }>(`${this.baseUrl}/dashboard`);
  }

  listTenants(): Observable<TenantListItem[]> {
    return this.http.get<TenantListItem[]>(`${this.baseUrl}/tenants`);
  }

  getTenant(id: number): Observable<TenantDetail> {
    return this.http.get<TenantDetail>(`${this.baseUrl}/tenants/${id}`);
  }

  createTenant(payload: TenantCreatePayload): Observable<TenantDetail> {
    return this.http.post<TenantDetail>(`${this.baseUrl}/tenants`, payload);
  }

  updateTenant(id: number, payload: TenantUpdatePayload): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`${this.baseUrl}/tenants/${id}`, payload);
  }

  activateTenant(id: number): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`${this.baseUrl}/tenants/${id}/activate`, {});
  }

  deactivateTenant(id: number): Observable<TenantDetail> {
    return this.http.patch<TenantDetail>(`${this.baseUrl}/tenants/${id}/deactivate`, {});
  }

  resetAdminPassword(id: number, new_password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/tenants/${id}/reset-password`,
      { new_password }
    );
  }

  impersonate(id: number): Observable<ImpersonateResult> {
    return this.http.post<ImpersonateResult>(
      `${this.baseUrl}/tenants/${id}/impersonate`,
      {}
    );
  }
}
