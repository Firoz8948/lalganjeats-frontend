import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
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
  router = inject(Router);
  private dp = inject(DeliveryPortalService);

  isOnline = signal(false);

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
    this.auth.logout();
  }

  get user() {
    return this.auth.currentUser();
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }
}
