import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// hp-active-orders.component.ts
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
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
export class HpActiveOrdersComponent implements OnInit, OnDestroy {
  orders  = signal<Order[]>([]);
  loading = signal(true);
  busyId  = signal<number | null>(null);
  toast   = signal<string | null>(null);
  private pollInterval?: any;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  statusSteps = [
    { key: 'accepted', label: 'Accepted' },
    { key: 'ready',    label: 'Ready' },
  ];

  constructor(private service: HotelPortalService) {}

  ngOnInit() {
    this.loadOrders();
    this.pollInterval = setInterval(() => this.loadOrders(), 5000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

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
    if (this.busyId()) return;
    const next = this.nextStatus(order.status);
    this.busyId.set(order.id);
    this.service.updateOrderStatus(order.id, next).subscribe({
      next: () => {
        this.busyId.set(null);
        this.showToast('Wait for delivery partner');
        this.loadOrders();
      },
      error: () => this.busyId.set(null),
    });
  }

  riderInitial(name?: string | null): string {
    const t = (name || 'D').trim();
    return t ? t.charAt(0).toUpperCase() : 'D';
  }

  private showToast(message: string) {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2000);
  }

  getStepIndex(status: string): number {
    return this.statusSteps.findIndex(s => s.key === status);
  }
}
