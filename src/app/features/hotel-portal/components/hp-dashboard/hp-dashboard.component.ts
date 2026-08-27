import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// hp-dashboard.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  HotelPortalService,
  DashboardData
} from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-dashboard.component.html',
  styleUrl:    './hp-dashboard.component.scss'
})
export class HpDashboardComponent implements OnInit {
  data    = signal<DashboardData | null>(null);
  loading = signal(true);
  refreshing = signal(false);

  constructor(private service: HotelPortalService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard(refresh = false) {
    if (refresh) {
      this.refreshing.set(true);
    } else if (!this.data()) {
      this.loading.set(true);
    }

    this.service.getDashboard().subscribe({
      next: d => {
        this.data.set(d);
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.refreshing.set(false);
      }
    });
  }

  getStatusColor(status: string): string {
    const map: Record<string,string> = {
      pending:   'warning',
      accepted:  'info',
      ready:     'orange',
      picked_up: 'info',
      delivered: 'success',
      cancelled: 'danger'
    };
    return map[status] || 'default';
  }
}
