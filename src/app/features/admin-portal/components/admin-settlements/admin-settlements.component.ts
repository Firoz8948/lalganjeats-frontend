import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, SettlementRow } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-settlements',
  standalone: true,
  imports: [CommonModule, PortalPageHeaderComponent],
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

  impersonateDeliveryPartner(row: SettlementRow) {
    if (!window.confirm(`Open the delivery dashboard as "${row.name}"?`)) return;
    this.impersonatingPartnerId.set(row.id);
    this.settlementError.set('');
    this.admin.impersonateDeliveryPartner(row.id).subscribe({
      next: (session) => {
        const started = this.auth.startDeliveryPartnerImpersonation({
          access_token: session.access_token,
          role: session.role,
          user_id: session.user_id,
          full_name: session.full_name || row.name,
          phone: session.phone || undefined,
          impersonated_by: session.impersonated_by,
          impersonation_session_id: session.impersonation_session_id,
          redirect_to: session.redirect_to,
        });
        this.impersonatingPartnerId.set(null);
        if (started) {
          this.router.navigateByUrl(session.redirect_to || '/deliverypartner/home');
        } else {
          this.settlementError.set('Only a tenant admin can impersonate a delivery partner.');
        }
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
