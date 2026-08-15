import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AdminService } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  stats = signal<any>(null);
  recentOrders = signal<any[]>([]);
  loading = signal(true);

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
