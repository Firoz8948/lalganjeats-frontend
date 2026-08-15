import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import {
  AdminOrderRow,
  AdminService,
  OrderBreakdown,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<AdminOrderRow[]>([]);
  ordersLoading = signal(false);
  breakdownOpen = signal(false);
  breakdownLoading = signal(false);
  breakdownError = signal('');
  breakdown = signal<OrderBreakdown | null>(null);

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.ordersLoading.set(true);
    this.admin.getOrders().subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false),
    });
  }

  couponLabel(order: AdminOrderRow): string {
    if (!order.promo_code) return '—';
    const parts = [order.promo_code];
    if (order.promo_percent_off != null) parts.push(`${order.promo_percent_off}% off`);
    if (order.promo_free_delivery) parts.push('Free delivery');
    return parts.join(' · ');
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
