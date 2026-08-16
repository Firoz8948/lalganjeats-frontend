// frontend/src/app/core/services/promo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientChannel, getClientChannel } from '../utils/client-channel';

export type { ClientChannel };

export interface PromoValidateResult {
  valid: boolean;
  reason?: string | null;
  message: string;
  download_required: boolean;
  code?: string | null;
  channel?: string | null;
  percent_off?: number | null;
  free_delivery: boolean;
  discount_amount?: number | null;
  delivery_fee_after?: number | null;
  remaining_uses?: number | null;
}

export interface PublicPromo {
  code: string;
  channel: string;
  percent_off: number | null;
  free_delivery: boolean;
  description: string | null;
  expires_at?: string | null;
}

/**
 * Public promocode validation.
 * Always send client_channel explicitly via getClientChannel().
 */
@Injectable({ providedIn: 'root' })
export class PromoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/promocodes`;

  get clientChannel(): ClientChannel {
    return getClientChannel();
  }

  constructor(private http: HttpClient) {}

  listActive(): Observable<PublicPromo[]> {
    return this.http.get<PublicPromo[]>(`${this.baseUrl}/active`);
  }

  validate(
    code: string,
    opts?: { subtotal?: number; delivery_fee?: number; client_channel?: ClientChannel }
  ): Observable<PromoValidateResult> {
    return this.http.post<PromoValidateResult>(`${this.baseUrl}/validate`, {
      code,
      client_channel: opts?.client_channel ?? this.clientChannel,
      subtotal: opts?.subtotal,
      delivery_fee: opts?.delivery_fee,
    });
  }
}
