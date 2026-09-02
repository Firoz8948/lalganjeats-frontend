import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  totalPages = signal(0);

  readonly showingFrom = computed(() => {
    if (!this.total()) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });
  readonly showingTo = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.load(1);
  }

  load(page = this.page()) {
    const nextPage = Math.max(1, Math.trunc(Number(page) || 1));
    this.loading.set(true);
    this.admin.getPaymentsReceived(nextPage).subscribe({
      next: (res) => {
        this.data.set(res);
        this.page.set(res.page || 1);
        this.pageSize.set(res.page_size || 10);
        this.total.set(res.total ?? res.count ?? 0);
        this.totalPages.set(res.total_pages || 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(raw: string | number) {
    const last = this.totalPages();
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n < 1 || !last) return;
    const target = Math.min(n, last);
    if (target === this.page() && (this.data()?.payments || []).length) return;
    this.load(target);
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
