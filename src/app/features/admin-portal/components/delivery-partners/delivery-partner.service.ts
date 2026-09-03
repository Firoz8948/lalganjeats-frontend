import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  DeliveryDocumentPurpose,
  DeliveryPartner,
  DeliveryPartnerCreate,
  DeliveryUploadPurpose,
  DeliveryUploadResult,
} from './delivery-partner.models';


@Injectable({ providedIn: 'root' })
export class DeliveryPartnerAdminService {
  private readonly base = `${environment.apiBaseUrl}/admin/delivery-partners`;

  constructor(private http: HttpClient) {}

  list(): Observable<DeliveryPartner[]> {
    return this.http.get<DeliveryPartner[]>(this.base);
  }

  create(payload: DeliveryPartnerCreate): Observable<DeliveryPartner> {
    return this.http.post<DeliveryPartner>(this.base, payload);
  }

  updateStatus(
    partnerId: number,
    isActive: boolean,
  ): Observable<{ id: number; is_active: boolean }> {
    return this.http.patch<{ id: number; is_active: boolean }>(
      `${this.base}/${partnerId}/status`,
      { is_active: isActive },
    );
  }

  updateMultiOrders(
    partnerId: number,
    allowMultipleOrders: boolean,
  ): Observable<{ id: number; allow_multiple_orders: boolean }> {
    return this.http.patch<{ id: number; allow_multiple_orders: boolean }>(
      `${this.base}/${partnerId}/multi-orders`,
      { allow_multiple_orders: allowMultipleOrders },
    );
  }

  updateCredentials(
    partnerId: number,
    payload: { username?: string | null; password?: string | null },
  ): Observable<DeliveryPartner> {
    return this.http.patch<DeliveryPartner>(
      `${this.base}/${partnerId}/credentials`,
      payload,
    );
  }

  upload(
    file: File,
    purpose: DeliveryUploadPurpose,
  ): Observable<DeliveryUploadResult> {
    const body = new FormData();
    body.append('purpose', purpose);
    body.append('file', file);
    return this.http.post<DeliveryUploadResult>(`${this.base}/upload`, body);
  }

  document(
    partnerId: number,
    purpose: DeliveryDocumentPurpose,
  ): Observable<Blob> {
    return this.http.get(
      `${this.base}/${partnerId}/documents/${purpose}`,
      { responseType: 'blob' },
    );
  }
}
