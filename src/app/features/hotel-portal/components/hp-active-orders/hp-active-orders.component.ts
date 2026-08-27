import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// hp-active-orders.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HotelPortalService, Order } from '../../services/hotel-portal.service';
import { HpIconComponent, HpIconName } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-active-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-active-orders.component.html',
  styleUrl:    './hp-active-orders.component.scss'
})
export class HpActiveOrdersComponent implements OnInit {
  orders  = signal<Order[]>([]);
  loading = signal(true);

  statusSteps = [
    { key: 'accepted', label: 'Accepted' },
    { key: 'ready',    label: 'Ready' },
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
    return current === 'accepted' ? 'ready' : current;
  }

  nextStatusLabel(current: string): string {
    if (current === 'accepted') return 'Food Cooked (Mark Ready)';
    if (current === 'ready') return 'Awaiting Pickup';
    return current;
  }

  nextStatusIcon(_current: string): HpIconName {
    return 'check';
  }

  canAdvance(status: string): boolean {
    return status === 'accepted';
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
