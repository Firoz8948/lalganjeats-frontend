// features/hotel-portal/components/hp-shell/hp-shell.component.ts
import {
  Component, OnInit, signal,
  HostListener, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { HotelPortalService } from '../../services/hotel-portal.service';
import { filter } from 'rxjs/operators';
import { HpIconComponent, HpIconName } from '../shared/hp-icon/hp-icon.component';

interface NavItem {
  label:   string;
  iconId:  HpIconName;
  route:   string;
  badge?:  number;
}

@Component({
  selector: 'app-hp-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, HpIconComponent],
  templateUrl: './hp-shell.component.html',
  styleUrl:    './hp-shell.component.scss'
})
export class HpShellComponent implements OnInit {

  auth    = inject(AuthService);
  service = inject(HotelPortalService);
  router  = inject(Router);

  isOpen          = signal(false);   // restaurant open/closed
  isSidebarOpen   = signal(false);   // mobile sidebar
  isMobile        = signal(false);
  restaurantName  = signal('My Restaurant');
  pendingCount    = signal(0);

  navItems: NavItem[] = [
    { label: 'Dashboard',       iconId: 'dashboard',       route: '/hotel-portal/dashboard'       },
    { label: 'Incoming Orders', iconId: 'bell',            route: '/hotel-portal/incoming-orders'  },
    { label: 'Active Orders',   iconId: 'flame',           route: '/hotel-portal/active-orders'    },
    { label: 'Order History',   iconId: 'clipboard',       route: '/hotel-portal/order-history'    },
    { label: 'Menu Manage',     iconId: 'utensils',        route: '/hotel-portal/menu'             },
    { label: 'Earnings',        iconId: 'wallet',          route: '/hotel-portal/earnings'         },
    { label: 'Settings',        iconId: 'settings',        route: '/hotel-portal/settings'         },
  ];

  ngOnInit() {
    this.checkMobile();
    this.loadRestaurantInfo();

    // Close mobile sidebar on route change
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.isSidebarOpen.set(false);
    });
  }

  @HostListener('window:resize')
  checkMobile() {
    this.isMobile.set(window.innerWidth <= 900);
  }

  loadRestaurantInfo() {
    this.service.getDashboard().subscribe({
      next: (data) => {
        this.restaurantName.set(data.restaurant.name);
        this.isOpen.set(data.restaurant.is_open);
        this.pendingCount.set(data.stats.pending_orders);

        // Set badge on incoming orders
        this.navItems = this.navItems.map(item =>
          item.label === 'Incoming Orders'
            ? { ...item, badge: data.stats.pending_orders }
            : item
        );
      }
    });
  }

  toggleShop() {
    this.service.toggleShopStatus().subscribe(res => {
      this.isOpen.set(res.is_open);
    });
  }

  toggleSidebar()  { this.isSidebarOpen.update(v => !v); }
  closeSidebar()   { this.isSidebarOpen.set(false);       }

  logout() { this.auth.logout(); }

  get user() { return this.auth.currentUser(); }

  isActive(route: string): boolean {
    return this.router.url === route ||
           this.router.url.startsWith(route + '/');
  }
}
