// features/profile/components/my-orders/my-orders.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  ProfileService,
  CustomerOrder
} from '../../services/profile.service';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './my-orders.component.html',
  styleUrl:    './my-orders.component.scss'
})
export class MyOrdersComponent implements OnInit {
  orders       = signal<CustomerOrder[]>([]);
  activeFilter = signal<OrderFilter>('all');
  loading      = signal(true);
  expandedId   = signal<number | null>(null);

  filters: { key: OrderFilter; label: string }[] = [
    { key: 'all',       label: 'All Orders' },
    { key: 'active',    label: 'Active'     },
    { key: 'completed', label: 'Completed'  },
    { key: 'cancelled', label: 'Cancelled'  },
  ];

  private readonly ORDER_FLOW = [
    { key: 'pending',          label: 'Waiting for restaurant' },
    { key: 'confirmed',        label: 'Restaurant cooking' },
    { key: 'ready_for_pickup', label: 'Waiting for pickup' },
    { key: 'picked_up',        label: 'Picked up' },
    { key: 'on_the_way',       label: 'On the way' },
    { key: 'delivered',        label: 'Delivered' },
  ];

  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit() { this.loadOrders('all'); }

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
    return ['assigned', 'picked_up', 'on_the_way'].includes(status);
  }

  /** Map internal statuses onto the customer-facing progress steps. */
  private flowKey(status: string): string {
    if (status === 'preparing') return 'confirmed';
    if (status === 'assigned') return 'ready_for_pickup';
    return status;
  }

  getTrackingSteps(currentStatus: string): TrackingStep[] {
    const currentIndex = this.ORDER_FLOW.findIndex(
      s => s.key === this.flowKey(currentStatus)
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
      pending:          'warning',
      confirmed:        'info',
      preparing:        'info',
      ready_for_pickup: 'warning',
      assigned:         'info',
      picked_up:        'info',
      on_the_way:       'info',
      delivered:        'success',
      cancelled:        'danger',
    };
    return map[status] || 'default';
  }

  getStatusLabel(order: CustomerOrder | string): string {
    if (typeof order === 'object' && order.status_meta) {
      return order.status_meta;
    }
    const status = typeof order === 'string' ? order : order.status;
    const map: Record<string, string> = {
      pending:          'Waiting for restaurant partner',
      confirmed:        'Restaurant is cooking your food',
      preparing:        'Restaurant is cooking your food',
      ready_for_pickup: 'Waiting for pickup',
      assigned:         'Waiting for pickup',
      picked_up:        'Order picked up',
      on_the_way:       'Order on the way',
      delivered:        'Order delivered',
      cancelled:        'Order cancelled',
    };
    return map[status] || status;
  }
}
