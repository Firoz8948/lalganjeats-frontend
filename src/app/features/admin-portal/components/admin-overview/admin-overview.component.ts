import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AdminService } from '../../../../core/services/admin.service';

interface DashboardStats {
  total_customers: number;
  total_restaurants: number;
  total_orders: number;
  total_delivery: number;
  total_revenue: number;
  active_promos: number;
}

interface LiveOrder {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string | null;
  restaurant_name: string | null;
  restaurant_phone: string | null;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
}

/** Customer POV pipeline shown in Live Orders. */
const LIVE_STATUS_FLOW = [
  'pending',
  'accepted',
  'ready',
  'picked_up',
  'delivered',
] as const;

const STATUS_SHORT: Record<string, string> = {
  pending: 'PEND',
  accepted: 'ACCEPT',
  ready: 'READY',
  picked_up: 'PICKED',
  delivered: '✓',
  cancelled: 'CANC',
};

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  liveOrders = signal<LiveOrder[]>([]);
  loading = signal(true);
  today = new Date();
  readonly statusFlow = LIVE_STATUS_FLOW;

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data.stats);
        this.liveOrders.set(data.live_orders ?? data.recent_orders ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusShort(status: string | null | undefined): string {
    const key = (status || '').toLowerCase();
    return STATUS_SHORT[key] || (status || '—').replace(/_/g, ' ');
  }

  statusIndex(status: string | null | undefined): number {
    return LIVE_STATUS_FLOW.indexOf(
      (status || '').toLowerCase() as (typeof LIVE_STATUS_FLOW)[number],
    );
  }

  isStepReached(orderStatus: string | null | undefined, step: string): boolean {
    const current = this.statusIndex(orderStatus);
    const stepIdx = LIVE_STATUS_FLOW.indexOf(
      step as (typeof LIVE_STATUS_FLOW)[number],
    );
    if (current < 0 || stepIdx < 0) return false;
    return stepIdx <= current;
  }

  isCurrentStep(orderStatus: string | null | undefined, step: string): boolean {
    return (orderStatus || '').toLowerCase() === step;
  }

  isDeliveredStep(step: string): boolean {
    return step === 'delivered';
  }
}
