// frontend/src/app/shared/bottom-nav/bottom-nav.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserSidebarService } from '../../core/services/user-sidebar.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  auth = inject(AuthService);
  sidebar = inject(UserSidebarService);
  private router = inject(Router);

  onProfileClick() {
    if (!this.auth.isLoggedIn() || !this.auth.isCustomer()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.sidebar.open();
  }

  onOrdersClick(event: Event) {
    if (!this.auth.isLoggedIn() || !this.auth.isCustomer()) {
      event.preventDefault();
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/profile/orders' },
      });
    }
  }

  isProfileActive(): boolean {
    if (this.sidebar.isOpen()) return true;
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/auth/login')) return true;
    if (url.startsWith('/profile/orders')) return false;
    return url.startsWith('/profile');
  }
}
