import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// hp-incoming-orders.component.ts
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  HotelPortalService, Order
} from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-incoming-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-incoming-orders.component.html',
  styleUrl:    './hp-incoming-orders.component.scss'
})
export class HpIncomingOrdersComponent implements OnInit, OnDestroy {
  orders     = signal<Order[]>([]);
  loading    = signal(true);
  private interval: any;

  constructor(private service: HotelPortalService) {}

  ngOnInit() {
    this.loadOrders();
    // Auto refresh every 30 seconds
    this.interval = setInterval(() => this.loadOrders(), 30000);
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  loadOrders() {
    this.service.getOrders('pending').subscribe({
      next:  d => { this.orders.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  accept(id: number) {
    this.service.updateOrderStatus(id, 'accepted').subscribe(
      () => this.loadOrders()
    );
  }

  reject(id: number) {
    if (confirm('Cancel this order?')) {
      this.service.updateOrderStatus(id, 'cancelled').subscribe(
        () => this.loadOrders()
      );
    }
  }
}
