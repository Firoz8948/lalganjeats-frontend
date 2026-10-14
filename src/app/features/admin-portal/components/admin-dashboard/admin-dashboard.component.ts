import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminBannersComponent } from '../admin-banners/admin-banners.component';
import { AdminCategoriesComponent } from '../admin-categories/admin-categories.component';
import { AdminCustomersComponent } from '../admin-customers/admin-customers.component';
import { AdminOrdersComponent } from '../admin-orders/admin-orders.component';
import { AdminOverviewComponent } from '../admin-overview/admin-overview.component';
import { AdminPromosComponent } from '../admin-promos/admin-promos.component';
import { AdminRestaurantsComponent } from '../admin-restaurants/admin-restaurants.component';
import { AdminSettlementsComponent } from '../admin-settlements/admin-settlements.component';
import { AdminSubcategoriesComponent } from '../admin-subcategories/admin-subcategories.component';
import { AdminGroceryPanelComponent } from '../admin-grocery-panel/admin-grocery-panel.component';
import { AdminZonesComponent } from '../admin-zones/admin-zones.component';
import { AdminPaymentsComponent } from '../admin-payments/admin-payments.component';
import { PaymentSettingsComponent } from '../payment-settings/payment-settings.component';
import { AdminReportsComponent } from '../reports/admin-reports.component';
import { DeliveryPartnersComponent } from '../delivery-partners/delivery-partners.component';
import { BroadcastNotificationsComponent } from '../broadcast-notifications/broadcast-notifications.component';

const ADMIN_TABS = [
  'overview', 'orders', 'payments', 'restaurants', 'delivery-partners', 'settlements', 'customers', 'promos',
  'categories', 'subcategories', 'grocery-panel', 'banners', 'zones', 'notifications', 'reports', 'payment-settings',
] as const;

type AdminTab = (typeof ADMIN_TABS)[number];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AdminOverviewComponent,
    AdminRestaurantsComponent,
    DeliveryPartnersComponent,
    AdminCategoriesComponent,
    AdminSubcategoriesComponent,
    AdminGroceryPanelComponent,
    AdminCustomersComponent,
    AdminOrdersComponent,
    AdminPaymentsComponent,
    AdminBannersComponent,
    PaymentSettingsComponent,
    AdminSettlementsComponent,
    AdminReportsComponent,
    AdminZonesComponent,
    AdminPromosComponent,
    BroadcastNotificationsComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  activeTab = signal<AdminTab>('overview');
  impersonating = signal(false);
  readonly liveBoardUrl = environment.liveBoardUrl;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.impersonating.set(this.auth.isImpersonating());
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab && (ADMIN_TABS as readonly string[]).includes(tab)) {
      this.activeTab.set(tab as AdminTab);
    }
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'overview' ? null : tab },
      replaceUrl: true,
    });
  }

  exitImpersonation() {
    if (this.auth.exitImpersonation()) {
      this.router.navigate(['/superadmin/dashboard']);
    }
  }

  logout() {
    if (this.impersonating()) {
      this.exitImpersonation();
      return;
    }
    this.auth.logout();
  }

  get user() {
    return this.auth.currentUser();
  }
}
