import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  ReportChannel,
  ReportDeliveryHistory,
  ReportRecipient,
  ReportRequest,
  ReportSummary,
} from './report.models';


@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/reports`;

  constructor(private http: HttpClient) {}

  recipients(): Observable<ReportRecipient[]> {
    return this.http.get<ReportRecipient[]>(`${this.baseUrl}/recipients`);
  }

  preview(payload: ReportRequest): Observable<ReportSummary> {
    return this.http.post<ReportSummary>(`${this.baseUrl}/preview`, payload);
  }

  download(payload: ReportRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/download`, payload, {
      responseType: 'blob',
    });
  }

  send(
    payload: ReportRequest,
    channel: ReportChannel,
    recipient?: string,
  ): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.baseUrl}/send`,
      { ...payload, channel, recipient: recipient || null },
    );
  }

  history(): Observable<ReportDeliveryHistory[]> {
    return this.http.get<ReportDeliveryHistory[]>(`${this.baseUrl}/history`);
  }
}
