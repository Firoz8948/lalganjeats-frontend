import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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
import { AdminZonesComponent } from '../admin-zones/admin-zones.component';
import { PaymentSettingsComponent } from '../payment-settings/payment-settings.component';
import { AdminReportsComponent } from '../reports/admin-reports.component';

type AdminTab =
  | 'overview'
  | 'restaurants'
  | 'categories'
  | 'subcategories'
  | 'customers'
  | 'orders'
  | 'banners'
  | 'payment'
  | 'settlements'
  | 'reports'
  | 'zones'
  | 'promos';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    AdminOverviewComponent,
    AdminRestaurantsComponent,
    AdminCategoriesComponent,
    AdminSubcategoriesComponent,
    AdminCustomersComponent,
    AdminOrdersComponent,
    AdminBannersComponent,
    PaymentSettingsComponent,
    AdminSettlementsComponent,
    AdminReportsComponent,
    AdminZonesComponent,
    AdminPromosComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  activeTab = signal<AdminTab>('overview');
  impersonating = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.impersonating.set(this.auth.isImpersonating());
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
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
