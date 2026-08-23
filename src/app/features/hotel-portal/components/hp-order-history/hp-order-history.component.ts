import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// features/hotel-portal/components/hp-order-history/hp-order-history.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  HotelPortalService,
  Order
} from '../../services/hotel-portal.service';
import { HpIconComponent, HpIconName } from '../shared/hp-icon/hp-icon.component';

type HistoryFilter = 'delivered' | 'cancelled';

@Component({
  selector: 'app-hp-order-history',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-order-history.component.html',
  styleUrl:    './hp-order-history.component.scss'
})
export class HpOrderHistoryComponent implements OnInit {
  orders       = signal<Order[]>([]);
  loading      = signal(true);
  activeFilter = signal<HistoryFilter>('delivered');
  expandedId   = signal<number | null>(null);

  filters: { key: HistoryFilter; label: string }[] = [
    { key: 'delivered', label: 'Delivered'      },
    { key: 'cancelled', label: 'Cancelled'      },
  ];

  constructor(private service: HotelPortalService) {}

  ngOnInit() { this.loadOrders('delivered'); }

  loadOrders(filter: HistoryFilter) {
    this.activeFilter.set(filter);
    this.loading.set(true);

    const statusParam = filter;
    this.service.getOrders(statusParam).subscribe({
      next:  (data) => { this.orders.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false)
    });
  }

  toggleExpand(orderId: number) {
    this.expandedId.update(id => id === orderId ? null : orderId);
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      delivered: 'success',
      cancelled: 'danger',
    };
    return map[status] || 'default';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  }

  getStatusIcon(status: string): HpIconName {
    return status === 'delivered' ? 'check' : 'x';
  }

  getTotalItems(order: Order): number {
    return order.items.reduce((sum, i) => sum + i.quantity, 0);
  }
}
