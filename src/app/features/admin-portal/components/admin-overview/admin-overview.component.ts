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

const STATUS_SHORT: Record<string, string> = {
  pending: 'Pend',
  confirmed: 'Conf',
  preparing: 'Prep',
  ready_for_pickup: 'Ready',
  assigned: 'Asgn',
  picked_up: 'Pick',
  on_the_way: 'OTW',
  delivered: 'Done',
  cancelled: 'Canc',
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

  /** Completed (delivered) is colorful; all other statuses stay grey. */
  statusTone(status: string | null | undefined): 'done' | 'muted' {
    return (status || '').toLowerCase() === 'delivered' ? 'done' : 'muted';
  }
}
