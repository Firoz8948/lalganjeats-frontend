import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// features/hotel-portal/components/hp-order-detail/hp-order-detail.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  HotelPortalService, Order
} from '../../services/hotel-portal.service';
import { HpIconComponent, HpIconName } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-order-detail.component.html',
  styleUrl:    './hp-order-detail.component.scss'
})
export class HpOrderDetailComponent implements OnInit {
  order   = signal<Order | null>(null);
  loading = signal(true);
  saving  = signal(false);

  readonly STATUS_FLOW = [
    { key: 'pending',   label: 'Pending',   icon: 'clipboard' as HpIconName },
    { key: 'accepted',  label: 'Accepted',  icon: 'check' as HpIconName },
    { key: 'ready',     label: 'Ready',     icon: 'package' as HpIconName },
    { key: 'picked_up', label: 'Picked Up', icon: 'bike' as HpIconName },
    { key: 'delivered', label: 'Delivered',  icon: 'check' as HpIconName },
  ];

  constructor(
    private route:   ActivatedRoute,
    private router:  Router,
    private service: HotelPortalService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadOrder(id);
  }

  loadOrder(id: number) {
    this.service.getOrders().subscribe({
      next: (orders) => {
        const found = orders.find(o => o.id === id) || null;
        this.order.set(found);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  updateStatus(status: string) {
    const o = this.order();
    if (!o) return;
    this.saving.set(true);
    this.service.updateOrderStatus(o.id, status).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadOrder(o.id);
      },
      error: () => this.saving.set(false)
    });
  }

  getNextStatus(current: string): { status: string; label: string; icon: HpIconName } | null {
    const flow: Record<string, { status: string; label: string; icon: HpIconName }> = {
      pending:  { status: 'accepted', label: 'Accept Order',             icon: 'check' },
      accepted: { status: 'ready',    label: 'Food Cooked (Mark Ready)', icon: 'check' },
    };
    return flow[current] || null;
  }

  getCurrentStepIndex(status: string): number {
    return this.STATUS_FLOW.findIndex(s => s.key === status);
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      pending:   'warning',
      accepted:  'info',
      ready:     'orange',
      picked_up: 'info',
      delivered: 'success',
      cancelled: 'danger'
    };
    return map[status] || 'default';
  }

  cancel() {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.updateStatus('cancelled');
    }
  }

  goBack() { this.router.navigate(['/hotel-portal/order-history']); }
}
