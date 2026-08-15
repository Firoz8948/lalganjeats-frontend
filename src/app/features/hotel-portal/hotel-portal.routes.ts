// features/hotel-portal/hotel-portal.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const HOTEL_PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/hp-shell/hp-shell.component')
        .then(m => m.HpShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-dashboard/hp-dashboard.component')
            .then(m => m.HpDashboardComponent)
      },
      {
        path: 'incoming-orders',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-incoming-orders/hp-incoming-orders.component')
            .then(m => m.HpIncomingOrdersComponent)
      },
      {
        path: 'active-orders',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-active-orders/hp-active-orders.component')
            .then(m => m.HpActiveOrdersComponent)
      },
      {
        path: 'order-history',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-order-history/hp-order-history.component')
            .then(m => m.HpOrderHistoryComponent)
      },
      {
        path: 'orders/:id',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-order-detail/hp-order-detail.component')
            .then(m => m.HpOrderDetailComponent)
      },
      {
        path: 'menu',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-menu-manage/hp-menu-manage.component')
            .then(m => m.HpMenuManageComponent)
      },
      {
        path: 'earnings',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-earnings/hp-earnings.component')
            .then(m => m.HpEarningsComponent)
      },
      {
        path: 'settings',
        canActivate: [roleGuard('restaurant_owner')],
        loadComponent: () =>
          import('./components/hp-settings/hp-settings.component')
            .then(m => m.HpSettingsComponent)
      }
    ]
  },
  // Login page (no shell)
  {
    path: 'login',
    loadComponent: () =>
      import('../auth/components/hotel-login/hotel-login.component')
        .then(m => m.HotelLoginComponent)
  }
];
