import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { AdminCustomerRow, AdminService } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, PortalPageHeaderComponent],
  templateUrl: './admin-customers.component.html',
  styleUrl: './admin-customers.component.scss',
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  customers = signal<AdminCustomerRow[]>([]);
  updatingId = signal<number | null>(null);
  loading = signal(false);
  query = signal('');
  page = signal(1);
  pageSize = signal(10);
  total = signal(0);
  totalPages = signal(0);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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

  ngOnDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  onSearch(value: string) {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(1), 300);
  }

  load(page = this.page()) {
    const nextPage = Math.max(1, Math.trunc(Number(page) || 1));
    this.loading.set(true);
    this.admin.getCustomers(nextPage, this.query()).subscribe({
      next: (res) => {
        this.customers.set(res.items || []);
        this.page.set(res.page || 1);
        this.pageSize.set(res.page_size || 10);
        this.total.set(res.total || 0);
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
    if (target === this.page() && this.customers().length) return;
    this.load(target);
  }

  toggleStatus(customer: AdminCustomerRow) {
    const nextActive = !customer.is_active;
    const action = nextActive ? 'reactivate' : 'suspend';
    if (!confirm(
      `Are you sure you want to ${action} ${customer.full_name || customer.phone}?`
      + (!nextActive
        ? '\n\nUse suspension only after reviewing refusal, fraud or policy violations.'
        : ''),
    )) return;
    this.updatingId.set(customer.id);
    this.admin.setCustomerStatus(customer.id, nextActive).subscribe({
      next: () => {
        this.customers.update((rows) => rows.map((row) =>
          row.id === customer.id ? { ...row, is_active: nextActive } : row,
        ));
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }
}
