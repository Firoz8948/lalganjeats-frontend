import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeliveryPortalService,
  DpDashboard,
  DpOrder,
} from '../../services/delivery-portal.service';

@Component({
  selector: 'app-dp-home',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalPageHeaderComponent],
  templateUrl: './dp-home.component.html',
  styleUrl: './dp-home.component.scss',
})
export class DpHomeComponent implements OnInit, OnDestroy {
  private api = inject(DeliveryPortalService);

  data = signal<DpDashboard | null>(null);
  error = signal('');
  busyId = signal<number | null>(null);
  otp = '';
  otpVerified = signal(false);
  lastDevOtp = signal('');
  cashAmount = 0;
  onlineAmount = 0;
  onlinePaid = signal(false);
  razorpayOrderId = '';
  razorpayPaymentId = '';
  razorpaySignature = '';
  private poll?: ReturnType<typeof setInterval>;
  private geoWatch?: number;

  ngOnInit() {
    this.refresh();
    this.poll = setInterval(() => this.refresh(), 5000);
    this.startGeo();
  }

  ngOnDestroy() {
    if (this.poll) clearInterval(this.poll);
    if (this.geoWatch != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatch);
    }
  }

  refresh() {
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        const active = d.active_order;
        if (active?.otp_verified) this.otpVerified.set(true);
        if (
          active
          && !this.onlinePaid()
          && !this.otp.trim()
          && (active.payment_status || '').toLowerCase() !== 'paid'
          && this.cashAmount === 0
          && this.onlineAmount === 0
        ) {
          this.cashAmount = active.customer_total;
          this.onlineAmount = 0;
        }
      },
      error: (e) => this.error.set(e.error?.detail || 'Failed to load'),
    });
  }

  isPrepaid(o: DpOrder): boolean {
    return (o.payment_status || '').toLowerCase() === 'paid';
  }

  startGeo() {
    if (!navigator.geolocation) return;
    this.geoWatch = navigator.geolocation.watchPosition(
      (pos) => {
        this.api.pingLocation(pos.coords.latitude, pos.coords.longitude).subscribe({ error: () => {} });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  toggleOnline() {
    this.api.toggleOnline().subscribe({ next: () => this.refresh() });
  }

  accept(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.accept(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Accept failed'); },
    });
  }

  reject(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.reject(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Reject failed'); },
    });
  }

  pickedUp(o: DpOrder) {
    this.api.pickedUp(o.id).subscribe({ next: () => this.refresh() });
  }

  onTheWay(o: DpOrder) {
    this.api.onTheWay(o.id).subscribe({ next: () => this.refresh() });
  }

  sendOtp(o: DpOrder) {
    this.api.sendOtp(o.id).subscribe({
      next: (r) => {
        if (r.dev_otp) this.lastDevOtp.set(r.dev_otp);
        this.error.set('');
      },
      error: (e) => this.error.set(e.error?.detail || 'Could not send OTP'),
    });
  }

  verifyOtp(o: DpOrder) {
    if (this.otp.trim().length !== 6) {
      this.error.set('Enter the 6-digit customer OTP');
      return;
    }
    this.api.verifyOtp(o.id, this.otp.trim()).subscribe({
      next: () => {
        this.otpVerified.set(true);
        this.error.set('');
      },
      error: (e) => this.error.set(e.error?.detail || 'Invalid OTP'),
    });
  }

  setFullCash(o: DpOrder) {
    this.cashAmount = o.customer_total;
    this.onlineAmount = 0;
    this.onlinePaid.set(false);
  }

  setFullOnline(o: DpOrder) {
    this.cashAmount = 0;
    this.onlineAmount = o.customer_total;
    this.onlinePaid.set(false);
  }

  setSplitHalf(o: DpOrder) {
    const half = Math.round((o.customer_total / 2) * 100) / 100;
    this.onSplitChange(o, 'cash', half);
  }

  onSplitChange(o: DpOrder, field: 'cash' | 'online', value: number) {
    const v = Math.max(0, Number(value) || 0);
    if (field === 'cash') {
      this.cashAmount = Math.min(v, o.customer_total);
      this.onlineAmount = Math.round((o.customer_total - this.cashAmount) * 100) / 100;
    } else {
      this.onlineAmount = Math.min(v, o.customer_total);
      this.cashAmount = Math.round((o.customer_total - this.onlineAmount) * 100) / 100;
    }
    this.onlinePaid.set(false);
  }

  payOnlinePortion(o: DpOrder) {
    if (this.onlineAmount <= 0) {
      this.error.set('Enter an online amount greater than 0');
      return;
    }
    this.api.createCollectionPayment(o.id, this.onlineAmount).subscribe({
      next: (pay) => {
        this.api.openCollectionCheckout(
          pay,
          (res) => {
            this.razorpayOrderId = res.razorpay_order_id;
            this.razorpayPaymentId = res.razorpay_payment_id;
            this.razorpaySignature = res.razorpay_signature;
            this.onlinePaid.set(true);
            this.error.set('');
          },
          () => this.error.set('Online payment cancelled'),
        );
      },
      error: (e) => this.error.set(e.error?.detail || 'Could not start online payment'),
    });
  }

  canComplete(o: DpOrder): boolean {
    if (!this.otpVerified()) return false;
    if (this.isPrepaid(o)) return true;
    const sum = Math.round((this.cashAmount + this.onlineAmount) * 100) / 100;
    if (Math.abs(sum - o.customer_total) > 0.05) return false;
    if (this.onlineAmount > 0 && !this.onlinePaid()) return false;
    return true;
  }

  complete(o: DpOrder) {
    if (!this.canComplete(o)) {
      this.error.set('Verify OTP and settle payment (cash / online / split) before delivering');
      return;
    }
    const payload: {
      otp: string;
      cash_amount: number;
      online_amount: number;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = {
      otp: this.otp.trim(),
      cash_amount: this.isPrepaid(o) ? 0 : this.cashAmount,
      online_amount: this.isPrepaid(o) ? 0 : this.onlineAmount,
    };
    if (!this.isPrepaid(o) && this.onlineAmount > 0) {
      payload.razorpay_order_id = this.razorpayOrderId;
      payload.razorpay_payment_id = this.razorpayPaymentId;
      payload.razorpay_signature = this.razorpaySignature;
    }
    this.api.complete(o.id, payload).subscribe({
      next: () => {
        this.otp = '';
        this.lastDevOtp.set('');
        this.otpVerified.set(false);
        this.onlinePaid.set(false);
        this.error.set('');
        this.refresh();
      },
      error: (e) => this.error.set(e.error?.detail || 'Complete failed'),
    });
  }
}
