// features/profile/components/my-orders/my-orders.component.ts
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ProfileService,
  CustomerOrder
} from '../../services/profile.service';
import { OrderLiveMapComponent } from '../../../tracking/components/order-live-map/order-live-map.component';

type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

interface TrackingStep {
  key:     string;
  label:   string;
  done:    boolean;
  current: boolean;
}

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, OrderLiveMapComponent],
  templateUrl: './my-orders.component.html',
  styleUrl:    './my-orders.component.scss'
})
export class MyOrdersComponent implements OnInit, OnDestroy {
  orders       = signal<CustomerOrder[]>([]);
  activeFilter = signal<OrderFilter>('all');
  loading      = signal(true);
  expandedId   = signal<number | null>(null);
  private pollTimer?: any;

  filters: { key: OrderFilter; label: string }[] = [
    { key: 'all',       label: 'All Orders' },
    { key: 'active',    label: 'Active'     },
    { key: 'completed', label: 'Completed'  },
    { key: 'cancelled', label: 'Cancelled'  },
  ];

  private readonly ORDER_FLOW = [
    { key: 'pending',   label: 'Pending' },
    { key: 'accepted',  label: 'Accepted' },
    { key: 'ready',     label: 'Ready' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'delivered', label: 'Delivered' },
  ];

  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOrders('all');
    this.startAutoPolling();
  }

  ngOnDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private startAutoPolling() {
    this.pollTimer = setInterval(() => {
      // Quiet background refresh without flashing loading spinner
      this.profileService.getOrders(this.activeFilter()).subscribe({
        next: (data) => this.orders.set(data),
        error: () => {}
      });
    }, 4000);
  }

  loadOrders(filter: OrderFilter) {
    this.activeFilter.set(filter);
    this.loading.set(true);
    this.profileService.getOrders(filter).subscribe({
      next:  (data) => { this.orders.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false)
    });
  }

  toggleExpand(orderId: number) {
    this.expandedId.update(id => id === orderId ? null : orderId);
  }

  orderAgain(order: CustomerOrder) {
    this.router.navigate(['/restaurants', order.restaurant_id]);
  }

  canTrack(status: string): boolean {
    return ['pending', 'accepted', 'ready', 'picked_up'].includes(status);
  }

  getTrackingSteps(currentStatus: string): TrackingStep[] {
    const currentIndex = this.ORDER_FLOW.findIndex(
      s => s.key === currentStatus
    );
    return this.ORDER_FLOW.map((step, i) => ({
      key:     step.key,
      label:   step.label,
      done:    i < currentIndex,
      current: i === currentIndex
    }));
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending:   'warning',
      accepted:  'info',
      ready:     'warning',
      picked_up: 'info',
      delivered: 'success',
      cancelled: 'danger',
    };
    return map[status] || 'default';
  }

  getStatusLabel(order: CustomerOrder | string): string {
    if (typeof order === 'object' && order.status_meta) {
      return order.status_meta;
    }
    const status = typeof order === 'string' ? order : order.status;
    const map: Record<string, string> = {
      pending:   'Waiting for restaurant to accept the order',
      accepted:  'Your food is getting cooked',
      ready:     'Waiting for pickup',
      picked_up: 'Delivery partner on the way',
      delivered: 'Order delivered',
      cancelled: 'Order cancelled',
    };
    return map[status] || status;
  }
}
