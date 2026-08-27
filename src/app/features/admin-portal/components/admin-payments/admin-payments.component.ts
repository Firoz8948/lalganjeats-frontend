import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import {
  AdminService,
  PaymentsReceivedResponse,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, PortalPageHeaderComponent],
  templateUrl: './admin-payments.component.html',
  styleUrl: './admin-payments.component.scss',
})
export class AdminPaymentsComponent implements OnInit {
  loading = signal(false);
  data = signal<PaymentsReceivedResponse | null>(null);

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.admin.getPaymentsReceived().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sourceLabel(source: string | null | undefined): string {
    if (source === 'delivery_partner') return 'Delivery partner';
    return 'Customer';
  }

  methodLabel(method: string | null | undefined): string {
    const m = (method || '').toLowerCase();
    if (m === 'prepaid_online') return 'Prepaid online';
    if (m === 'doorstep_online') return 'Doorstep online';
    if (m === 'cash_remittance') return 'Cash payment cleared';
    return method || '—';
  }
}
