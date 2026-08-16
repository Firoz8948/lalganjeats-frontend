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

interface RecentOrder {
  id: number;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  recentOrders = signal<RecentOrder[]>([]);
  loading = signal(true);
  today = new Date();

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data.stats);
        this.recentOrders.set(data.recent_orders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
