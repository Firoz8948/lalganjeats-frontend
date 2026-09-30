// frontend/src/app/shared/bottom-nav/bottom-nav.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs';
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

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Grocery tab on home, or any grocery products page. */
  readonly isGroceryActive = computed(() => {
    const tree = this.router.parseUrl(this.url());
    const path = this.url().split(/[?#]/)[0];
    return path.startsWith('/home/shop/grocery')
      || (path === '/home' && tree.queryParams['category'] === 'grocery');
  });

  readonly isHomeActive = computed(() => {
    const path = this.url().split(/[?#]/)[0];
    return (path === '/home' || path === '/') && !this.isGroceryActive() && !this.sidebar.isOpen();
  });

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
