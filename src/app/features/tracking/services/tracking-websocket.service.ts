import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TrackSnapshot } from './tracking.service';

export type TrackingWsMessage =
  | { type: 'track_update'; order_id: number; data: TrackSnapshot }
  | { type: 'pong' }
  | { type: 'error'; detail: string };

@Injectable({ providedIn: 'root' })
export class TrackingWebsocketService {
  private socket: WebSocket | null = null;
  private messages$ = new Subject<TrackingWsMessage>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private orderId: number | null = null;

  connect(orderId: number): Observable<TrackingWsMessage> {
    this.disconnect();
    this.intentionalClose = false;
    this.orderId = orderId;
    this.openSocket(orderId);
    return this.messages$.asObservable();
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
    this.orderId = null;
  }

  private openSocket(orderId: number) {
    const token = localStorage.getItem(environment.tokenKey) || '';
    const base = (environment as { wsBaseUrl?: string }).wsBaseUrl
      || environment.apiBaseUrl.replace(/^http/, 'ws');
    const url = `${base}/websocket/tracking/${orderId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);
    };

    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as TrackingWsMessage;
        this.messages$.next(parsed);
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.socket = null;
      if (!this.intentionalClose && this.orderId != null) {
        this.reconnectTimer = setTimeout(() => {
          if (this.orderId != null) this.openSocket(this.orderId);
        }, 2000);
      }
    };

    ws.onerror = () => {
      /* onclose handles reconnect */
    };
  }
}
