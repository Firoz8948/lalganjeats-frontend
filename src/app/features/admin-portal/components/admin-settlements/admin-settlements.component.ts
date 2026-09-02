import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { PagedHistoryComponent, HistoryColumn } from '../../../../shared/paged-history/paged-history.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, SettlementRow } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-settlements',
  standalone: true,
  imports: [CommonModule, PortalPageHeaderComponent, PagedHistoryComponent],
  templateUrl: './admin-settlements.component.html',
  styleUrl: './admin-settlements.component.scss',
})
export class AdminSettlementsComponent implements OnInit {
  restaurantSettlements = signal<SettlementRow[]>([]);
  deliverySettlements = signal<SettlementRow[]>([]);
  settlementsLoading = signal(false);
  settlementAction = signal('');
  settlementError = signal('');
  settlementSuccess = signal('');
  impersonatingPartnerId = signal<number | null>(null);
  openRestaurantHistory = signal<number | null>(null);
  openDeliveryHistory = signal<number | null>(null);
  openDeliveryCashHistory = signal<number | null>(null);

  readonly settlementColumns: HistoryColumn[] = [
    { key: 'settled_at', label: 'Date', kind: 'datetime' },
    { key: 'order_count', label: 'Orders' },
    { key: 'amount', label: 'Amount', kind: 'money' },
  ];
  readonly cashColumns: HistoryColumn[] = [
    { key: 'created_at', label: 'Date', kind: 'datetime' },
    { key: 'amount', label: 'Amount', kind: 'money' },
    { key: 'order_count', label: 'Orders' },
    { key: 'status', label: 'Status', kind: 'status' },
  ];

  constructor(
    private admin: AdminService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadSettlements();
  }

  loadSettlements() {
    this.settlementsLoading.set(true);
    this.settlementError.set('');
    let completed = 0;
    const finish = () => {
      completed += 1;
      if (completed === 2) this.settlementsLoading.set(false);
    };
    this.admin.getRestaurantSettlements().subscribe({
      next: (rows) => { this.restaurantSettlements.set(rows); finish(); },
      error: () => {
        this.settlementError.set('Failed to load restaurant settlements.');
        finish();
      },
    });
    this.admin.getDeliverySettlements().subscribe({
      next: (rows) => { this.deliverySettlements.set(rows); finish(); },
      error: () => {
        this.settlementError.set('Failed to load delivery partner settlements.');
        finish();
      },
    });
  }

  settleRestaurant(row: SettlementRow) {
    this.runSettlement('restaurant', row);
  }

  settleDeliveryPartner(row: SettlementRow) {
    this.runSettlement('delivery', row);
  }

  toggleRestaurantHistory(id: number) {
    this.openRestaurantHistory.set(this.openRestaurantHistory() === id ? null : id);
  }

  toggleDeliveryHistory(id: number) {
    this.openDeliveryHistory.set(this.openDeliveryHistory() === id ? null : id);
  }

  toggleDeliveryCashHistory(id: number) {
    this.openDeliveryCashHistory.set(this.openDeliveryCashHistory() === id ? null : id);
  }

  restaurantHistoryFetcher = (id: number) => (page: number) =>
    this.admin.getRestaurantSettlementHistory(id, page);

  deliveryHistoryFetcher = (id: number) => (page: number) =>
    this.admin.getDeliverySettlementHistory(id, page);

  deliveryCashHistoryFetcher = (id: number) => (page: number) =>
    this.admin.getDeliveryCashHistory(id, page);

  impersonateDeliveryPartner(row: SettlementRow) {
    if (!window.confirm(`Open the delivery dashboard as "${row.name}"?`)) return;
    this.impersonatingPartnerId.set(row.id);
    this.settlementError.set('');
    this.admin.impersonateDeliveryPartner(row.id).subscribe({
      next: (session) => {
        this.impersonatingPartnerId.set(null);
        const deliveryUrl = `https://delivery.lalganjeats.com/auth/delivery-login?impersonate_token=${encodeURIComponent(session.access_token)}`;
        window.open(deliveryUrl, '_blank');
      },
      error: (error) => {
        this.impersonatingPartnerId.set(null);
        this.settlementError.set(
          error?.error?.detail || 'Could not open the delivery partner dashboard.',
        );
      },
    });
  }

  private runSettlement(type: 'restaurant' | 'delivery', row: SettlementRow) {
    if (row.unsettled_amount <= 0) return;
    const confirmed = window.confirm(
      `Mark ₹${row.unsettled_amount.toFixed(2)} for ${row.name} as settled? ` +
      'Pay the partner manually before confirming.',
    );
    if (!confirmed) return;

    this.settlementAction.set(`${type}-${row.id}`);
    this.settlementError.set('');
    this.settlementSuccess.set('');
    const request = type === 'restaurant'
      ? this.admin.settleRestaurant(row.id)
      : this.admin.settleDeliveryPartner(row.id);
    request.subscribe({
      next: (result) => {
        this.settlementSuccess.set(
          `Settled ₹${result.settled_amount.toFixed(2)} across ` +
          `${result.settled_orders} order${result.settled_orders === 1 ? '' : 's'} for ${row.name}.`,
        );
        this.settlementAction.set('');
        this.loadSettlements();
      },
      error: (error) => {
        this.settlementError.set(error?.error?.detail || 'Settlement failed. Please try again.');
        this.settlementAction.set('');
      },
    });
  }
}
