import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  AdminOrderRow,
  AdminService,
  OrderBreakdown,
} from '../../../../core/services/admin.service';

type OrderStatusFilter =
  | 'all'
  | 'pending'
  | 'accepted'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, PortalPageHeaderComponent],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<AdminOrderRow[]>([]);
  ordersLoading = signal(false);
  statusFilter = signal<OrderStatusFilter>('all');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  totalPages = signal(0);
  breakdownOpen = signal(false);
  breakdownLoading = signal(false);
  breakdownError = signal('');
  breakdown = signal<OrderBreakdown | null>(null);

  readonly showingFrom = computed(() => {
    if (!this.total()) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });
  readonly showingTo = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  readonly statusFilters: { key: OrderStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'ready', label: 'Ready' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'delivered', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.loadOrders(1);
  }

  setStatusFilter(status: OrderStatusFilter) {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.loadOrders(1);
  }

  loadOrders(page = this.page()) {
    const nextPage = Math.max(1, Math.trunc(Number(page) || 1));
    this.ordersLoading.set(true);
    this.admin.getOrders(this.statusFilter(), nextPage).subscribe({
      next: (res) => {
        this.orders.set(res.items || []);
        this.page.set(res.page || 1);
        this.pageSize.set(res.page_size || 10);
        this.total.set(res.total || 0);
        this.totalPages.set(res.total_pages || 0);
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false),
    });
  }

  goToPage(raw: string | number) {
    const last = this.totalPages();
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n < 1 || !last) return;
    const target = Math.min(n, last);
    if (target === this.page() && this.orders().length) return;
    this.loadOrders(target);
  }

  statusLabel(status: string | null | undefined): string {
    const key = (status || '').toLowerCase();
    if (key === 'delivered') return 'Completed';
    if (key === 'picked_up') return 'Picked Up';
    return (status || '—').replace(/_/g, ' ');
  }

  couponLabel(order: AdminOrderRow): string {
    if (!order.promo_code) return '—';
    const parts = [order.promo_code];
    if (order.promo_percent_off != null) parts.push(`${order.promo_percent_off}% off`);
    if (order.promo_free_delivery) parts.push('Free delivery');
    return parts.join(' · ');
  }

  modeFallback(order: AdminOrderRow): string {
    if ((order.payment_status || '') === 'failed') return 'Payment failed';
    return order.payment_method === 'online' ? 'Payment pending' : 'COD';
  }

  showVerified(order: AdminOrderRow): boolean {
    return !!order.payment_verified && (order.payment_mode === 'paid' || order.payment_mode === 'dp_qr');
  }

  customerPaidLabel(details: OrderBreakdown): string {
    const mode =
      details.payment_mode_label ||
      details.payment_label ||
      (details.payment_method === 'online' ? 'Paid' : 'COD');
    return `Customer paid · ${mode}`;
  }

  adminCashflow(details: OrderBreakdown): number {
    return (
      Number(details.customer_total || 0) -
      Number(details.hotel_price || 0) -
      Number(details.delivery_price || 0)
    );
  }

  openOrderBreakdown(order: AdminOrderRow) {
    this.breakdownOpen.set(true);
    this.breakdown.set(null);
    this.breakdownError.set('');
    this.breakdownLoading.set(true);
    this.admin.getOrderBreakdown(order.id).subscribe({
      next: (data) => {
        this.breakdown.set(data);
        this.breakdownLoading.set(false);
      },
      error: (error) => {
        this.breakdownLoading.set(false);
        this.breakdownError.set(
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Failed to load breakdown.',
        );
      },
    });
  }

  closeOrderBreakdown() {
    this.breakdownOpen.set(false);
    this.breakdown.set(null);
    this.breakdownError.set('');
  }
}
