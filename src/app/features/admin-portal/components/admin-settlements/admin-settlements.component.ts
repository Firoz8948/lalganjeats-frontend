import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AdminService, SettlementRow } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-settlements',
  standalone: true,
  imports: [CommonModule],
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

  constructor(private admin: AdminService) {}

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
