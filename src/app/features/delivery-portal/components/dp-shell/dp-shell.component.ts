import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../../core/services/admin.service';
import { DeliveryPortalService } from '../../services/delivery-portal.service';

@Component({
  selector: 'app-dp-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dp-shell.component.html',
  styleUrl: './dp-shell.component.scss',
})
export class DpShellComponent implements OnInit {
  auth = inject(AuthService);
  private admin = inject(AdminService);
  router = inject(Router);
  private dp = inject(DeliveryPortalService);

  isOnline = signal(false);
  impersonating = computed(() => this.auth.isDeliveryPartnerImpersonating());

  bottomNav = [
    { label: 'Home', route: '/deliverypartner/home', icon: 'home' },
    { label: 'Orders', route: '/deliverypartner/orders', icon: 'orders' },
    { label: 'Earnings', route: '/deliverypartner/earnings', icon: 'earn' },
  ];

  ngOnInit() {
    this.dp.dashboard().subscribe({
      next: (d) => this.isOnline.set(d.profile.is_online),
      error: () => {},
    });
  }

  toggleOnline() {
    this.dp.toggleOnline().subscribe({
      next: (r) => this.isOnline.set(r.is_online),
    });
  }

  logout() {
    if (this.impersonating()) {
      this.exitImpersonation();
      return;
    }
    this.auth.logout();
  }

  exitImpersonation() {
    const restore = () => {
      if (this.auth.exitAdminImpersonation()) {
        this.router.navigate(['/admin/dashboard']);
      }
    };
    this.admin.exitImpersonation().subscribe({
      next: () => restore(),
      error: () => restore(),
    });
  }

  get user() {
    return this.auth.currentUser();
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }
}
