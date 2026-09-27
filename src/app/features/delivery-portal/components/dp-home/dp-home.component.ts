import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DeliveryPortalService,
  DpDashboard,
  DpOrder,
} from '../../services/delivery-portal.service';

import { NotificationService } from '../../../../core/services/notification.service';
import { GpsFix, RiderLocationService } from '../../../../core/services/rider-location.service';

interface OrderWork {
  otp: string;
  otpVerified: boolean;
  lastDevOtp: string;
  sendingOtp: boolean;
  verifyingOtp: boolean;
  completing: boolean;
  cashAmount: number;
  onlineAmount: number;
  onlinePaid: boolean;
}

@Component({
  selector: 'app-dp-home',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalPageHeaderComponent],
  templateUrl: './dp-home.component.html',
  styleUrl: './dp-home.component.scss',
})
export class DpHomeComponent implements OnInit, OnDestroy {
  private api = inject(DeliveryPortalService);
  private notif = inject(NotificationService);
  private router = inject(Router);
  riderLoc = inject(RiderLocationService);

  data = signal<DpDashboard | null>(null);
  error = signal('');
  busyId = signal<number | null>(null);
  acceptingAll = signal(false);
  orderWork = signal<Record<number, OrderWork>>({});
  orderDelivered = signal(false);
  deliveredStayOnHome = signal(false);
  razorpayOrderId = '';
  razorpayPaymentId = '';
  razorpaySignature = '';
  private collectionTxnId = '';
  private collectionPoll?: ReturnType<typeof setInterval>;

  private poll?: ReturnType<typeof setInterval>;
  private knownOfferIds = new Set<number>();
  private isFirstDpLoad = true;

  ngOnInit() {
    // No GPS on load: one fix on Accept, then 2-minute pings only after pickup.
    this.refresh();
    this.poll = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    if (this.poll) clearInterval(this.poll);
    if (this.collectionPoll) clearInterval(this.collectionPoll);
  }

  private syncLocationTracking(actives: DpOrder[]) {
    const pickedUp = actives.filter((o) => this.isPickedUp(o)).map((o) => o.id);
    if (pickedUp.length) void this.riderLoc.startDeliveryTracking(pickedUp);
    else void this.riderLoc.stopDeliveryTracking();
  }

  isPickedUp(o: DpOrder): boolean {
    const s = (o.status || '').toLowerCase();
    return s === 'picked_up' || s === 'out_for_delivery';
  }

  navUrl(lat?: number | null, lng?: number | null, address?: string | null): string | null {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    }
    if (address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
    }
    return null;
  }

  lastPingLabel(): string {
    const at = this.riderLoc.lastSentAt();
    if (!at) return 'sending first update...';
    const mins = Math.round((Date.now() - at) / 60000);
    return mins <= 0 ? 'updated just now' : `updated ${mins} min ago`;
  }

  refresh() {
    this.api.dashboard().subscribe({
      next: (d) => {
        let hasNewOffer = false;
        let newestOfferNum = '';

        if (d.available_orders) {
          for (const o of d.available_orders) {
            if (!this.knownOfferIds.has(o.id)) {
              this.knownOfferIds.add(o.id);
              hasNewOffer = true;
              newestOfferNum = o.order_number;
            }
          }
        }

        if (hasNewOffer && !this.isFirstDpLoad) {
          this.notif.notifyNewOffer(newestOfferNum);
        }

        this.isFirstDpLoad = false;
        this.data.set(d);
        const actives = this.activeOrders(d);
        this.hydrateOrderWork(actives);
        this.syncLocationTracking(actives);
      },
      error: (e) => this.error.set(e.error?.detail || 'Failed to load'),
    });
  }

  allowMultiple(d: DpDashboard): boolean {
    return !!d.profile.allow_multiple_orders;
  }

  activeOrders(d: DpDashboard | null): DpOrder[] {
    if (!d) return [];
    if (d.active_orders?.length) return d.active_orders;
    return d.active_order ? [d.active_order] : [];
  }

  w(o: DpOrder): OrderWork {
    return this.orderWork()[o.id] ?? this.defaultWork(o);
  }

  setOtp(o: DpOrder, value: string) {
    this.patchWork(o.id, { otp: value });
  }

  private defaultWork(o?: DpOrder): OrderWork {
    const prepaid = o ? this.isPrepaid(o) : false;
    return {
      otp: '',
      otpVerified: !!o?.otp_verified,
      lastDevOtp: '',
      sendingOtp: false,
      verifyingOtp: false,
      completing: false,
      cashAmount: o && !prepaid ? o.customer_total : 0,
      onlineAmount: 0,
      onlinePaid: false,
    };
  }

  private patchWork(id: number, patch: Partial<OrderWork>) {
    this.orderWork.update((all) => {
      const current = all[id] ?? this.defaultWork();
      return { ...all, [id]: { ...current, ...patch } };
    });
  }

  private hydrateOrderWork(orders: DpOrder[]) {
    this.orderWork.update((all) => {
      const next: Record<number, OrderWork> = { ...all };
      const ids = new Set(orders.map((order) => order.id));
      for (const order of orders) {
        const existing = next[order.id];
        if (!existing) {
          next[order.id] = this.defaultWork(order);
        } else if (order.otp_verified && !existing.otpVerified) {
          next[order.id] = { ...existing, otpVerified: true };
        }
      }
      for (const id of Object.keys(next)) {
        const numId = Number(id);
        if (!ids.has(numId)) delete next[numId];
      }
      return next;
    });
  }

  isPrepaid(o: DpOrder): boolean {
    return (o.payment_status || '').toLowerCase() === 'paid';
  }

  toggleOnline() {
    this.api.toggleOnline().subscribe({ next: () => this.refresh() });
  }

  async accept(o: DpOrder) {
    this.busyId.set(o.id);
    const fix: GpsFix | null = await this.riderLoc.captureOnce().catch(() => null);
    this.api.accept(o.id, fix).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Accept failed'); },
    });
  }

  async acceptAll(orders: DpOrder[]) {
    if (!orders.length || this.acceptingAll()) return;
    this.acceptingAll.set(true);
    this.error.set('');
    const fix: GpsFix | null = await this.riderLoc.captureOnce().catch(() => null);
    const run = (index: number) => {
      if (index >= orders.length) {
        this.acceptingAll.set(false);
        this.refresh();
        return;
      }
      this.api.accept(orders[index].id, fix).subscribe({
        next: () => run(index + 1),
        error: (e) => {
          this.acceptingAll.set(false);
          this.error.set(e.error?.detail || 'Could not accept all orders');
          this.refresh();
        },
      });
    };
    run(0);
  }

  reject(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.reject(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Reject failed'); },
    });
  }

  pickedUp(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.pickedUp(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Update failed'); },
    });
  }

  sendOtp(o: DpOrder) {
    this.patchWork(o.id, { sendingOtp: true });
    this.error.set('');
    this.api.sendOtp(o.id).subscribe({
      next: (res) => {
        this.patchWork(o.id, {
          sendingOtp: false,
          lastDevOtp: res.dev_otp || this.w(o).lastDevOtp,
        });
      },
      error: (e) => {
        this.patchWork(o.id, { sendingOtp: false });
        this.error.set(e.error?.detail || 'Failed to send OTP to customer');
      },
    });
  }

  verifyOtp(o: DpOrder) {
    const code = this.w(o).otp.trim();
    if (code.length < 4 || code.length > 6) {
      this.error.set('Please enter the 4-digit OTP sent to customer');
      return;
    }
    this.patchWork(o.id, { verifyingOtp: true });
    this.error.set('');
    this.api.verifyOtp(o.id, code).subscribe({
      next: () => {
        this.patchWork(o.id, { verifyingOtp: false, otpVerified: true });
        this.refresh();
      },
      error: (e) => {
        this.patchWork(o.id, { verifyingOtp: false });
        this.error.set(e.error?.detail || 'Invalid or expired OTP. Please try again.');
      },
    });
  }

  setFullCash(a: DpOrder) {
    this.patchWork(a.id, {
      cashAmount: a.customer_total,
      onlineAmount: 0,
      onlinePaid: false,
    });
  }

  setFullOnline(a: DpOrder) {
    this.patchWork(a.id, {
      cashAmount: 0,
      onlineAmount: a.customer_total,
      onlinePaid: false,
    });
  }

  setSplitHalf(a: DpOrder) {
    const half = Math.round(a.customer_total / 2);
    this.patchWork(a.id, {
      cashAmount: half,
      onlineAmount: Math.max(0, a.customer_total - half),
      onlinePaid: false,
    });
  }

  onSplitChange(a: DpOrder, mode: 'cash' | 'online', val: number) {
    const num = Math.max(0, Number(val) || 0);
    const total = a.customer_total;
    if (mode === 'cash') {
      this.patchWork(a.id, {
        cashAmount: num,
        onlineAmount: Math.max(0, total - num),
        onlinePaid: false,
      });
    } else {
      this.patchWork(a.id, {
        onlineAmount: num,
        cashAmount: Math.max(0, total - num),
        onlinePaid: false,
      });
    }
  }

  payOnlinePortion(a: DpOrder) {
    const work = this.w(a);
    if (work.onlineAmount <= 0) return;
    this.busyId.set(a.id);
    this.error.set('');
    this.api.initiateOnlineCollection(a.id, work.onlineAmount).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.collectionTxnId = res.txnid;
        if (res.qr_url) {
          window.open(res.qr_url, '_blank', 'noopener');
        }
        if (this.collectionPoll) clearInterval(this.collectionPoll);
        this.collectionPoll = setInterval(() => {
          this.api.getOnlineCollectionStatus(a.id, res.txnid).subscribe({
            next: (st) => {
              if (st.paid) {
                if (this.collectionPoll) clearInterval(this.collectionPoll);
                this.collectionPoll = undefined;
                this.patchWork(a.id, { onlinePaid: true });
              }
            },
          });
        }, 3500);
      },
      error: (e) => {
        this.busyId.set(null);
        this.error.set(e.error?.detail || 'Could not initiate collection payment');
      },
    });
  }

  canComplete(a: DpOrder): boolean {
    const work = this.w(a);
    if (!work.otpVerified) return false;
    if (this.isPrepaid(a)) return true;
    const need = a.customer_total;
    const have = (work.cashAmount || 0) + (work.onlineAmount || 0);
    if (Math.abs(have - need) > 0.01) return false;
    if (work.onlineAmount > 0 && !work.onlinePaid) return false;
    return true;
  }

  complete(o: DpOrder) {
    const work = this.w(o);
    this.patchWork(o.id, { completing: true });
    this.error.set('');
    const payload = {
      otp: work.otp.trim(),
      cash_amount: work.cashAmount,
      online_amount: work.onlineAmount,
      collection_txnid: this.collectionTxnId || undefined,
    };
    this.api.complete(o.id, payload).subscribe({
      next: () => {
        this.patchWork(o.id, { completing: false });
        this.collectionTxnId = '';
        this.orderWork.update((all) => {
          const next = { ...all };
          delete next[o.id];
          return next;
        });
        const remaining = this.activeOrders(this.data()).filter((item) => item.id !== o.id);
        this.deliveredStayOnHome.set(remaining.length > 0);
        this.orderDelivered.set(true);
        this.refresh();
        setTimeout(() => {
          this.orderDelivered.set(false);
          this.deliveredStayOnHome.set(false);
          if (remaining.length === 0) {
            this.router.navigate(['/deliverypartner/orders']);
          }
        }, 1800);
      },
      error: (e) => {
        this.patchWork(o.id, { completing: false });
        this.error.set(e.error?.detail || 'Failed to complete delivery');
      },
    });
  }

  /** Opens the Google Maps app with directions from the rider's live GPS. */
  openDirections(lat?: number | null, lng?: number | null, address?: string | null) {
    const url = this.navUrl(lat, lng, address);
    if (url) window.open(url, '_system');
  }
}
