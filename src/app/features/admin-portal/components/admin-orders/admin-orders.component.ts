import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
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
  breakdownOpen = signal(false);
  breakdownLoading = signal(false);
  breakdownError = signal('');
  breakdown = signal<OrderBreakdown | null>(null);

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
    this.loadOrders();
  }

  setStatusFilter(status: OrderStatusFilter) {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.loadOrders();
  }

  loadOrders() {
    this.ordersLoading.set(true);
    this.admin.getOrders(this.statusFilter()).subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false),
    });
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
    return order.payment_method === 'online' ? 'Paid' : 'COD';
  }

  showVerified(order: AdminOrderRow): boolean {
    return !!order.payment_verified && (order.payment_mode === 'paid' || order.payment_mode === 'dp_qr');
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
