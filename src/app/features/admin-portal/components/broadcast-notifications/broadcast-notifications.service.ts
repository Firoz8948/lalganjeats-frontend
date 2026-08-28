import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface BroadcastPayload {
  title: string;
  body: string;
  target_audience: 'all' | 'customers' | 'restaurant_owners' | 'delivery_partners';
  image_url?: string;
  deep_link?: string;
}

export interface BroadcastResult {
  success: boolean;
  target_audience: string;
  total_eligible_users: number;
  sent_count: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BroadcastNotificationsService {
  private http = inject(HttpClient);
  private api = `${environment.apiBaseUrl}/broadcast-notifications`;

  send(payload: BroadcastPayload): Observable<BroadcastResult> {
    return this.http.post<BroadcastResult>(`${this.api}/send`, payload);
  }
}
