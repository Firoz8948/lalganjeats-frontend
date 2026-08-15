// hp-active-orders.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HotelPortalService, Order } from '../../services/hotel-portal.service';
import { HpIconComponent, HpIconName } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-active-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent],
  templateUrl: './hp-active-orders.component.html',
  styleUrl:    './hp-active-orders.component.scss'
})
export class HpActiveOrdersComponent implements OnInit {
  orders  = signal<Order[]>([]);
  loading = signal(true);

  statusSteps = [
    { key: 'confirmed',        label: 'Confirmed'       },
    { key: 'preparing',        label: 'Preparing'       },
    { key: 'ready_for_pickup', label: 'Ready for Pickup'},
  ];

  constructor(private service: HotelPortalService) {}

  ngOnInit() { this.loadOrders(); }

  loadOrders() {
    this.service.getOrders('active').subscribe({
      next:  d => { this.orders.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  nextStatus(current: string): string {
    const flow: Record<string,string> = {
      confirmed:        'preparing',
      preparing:        'ready_for_pickup',
      ready_for_pickup: 'ready_for_pickup'
    };
    return flow[current] || current;
  }

  nextStatusLabel(current: string): string {
    const labels: Record<string,string> = {
      confirmed:        'Start Preparing',
      preparing:        'Mark Ready',
      ready_for_pickup: 'Awaiting Pickup'
    };
    return labels[current] || current;
  }

  nextStatusIcon(current: string): HpIconName {
    return current === 'confirmed' ? 'flame' : 'package';
  }

  canAdvance(status: string): boolean {
    return ['confirmed', 'preparing'].includes(status);
  }

  advanceStatus(order: Order) {
    const next = this.nextStatus(order.status);
    this.service.updateOrderStatus(order.id, next).subscribe(
      () => this.loadOrders()
    );
  }

  getStepIndex(status: string): number {
    return this.statusSteps.findIndex(s => s.key === status);
  }
}
