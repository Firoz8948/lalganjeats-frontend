// frontend/src/app/features/admin-portal/admin-portal.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ADMIN_PORTAL_ROUTES: Routes = [
  // /admin → dashboard (roleGuard sends guests to /auth/admin-login)
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./components/admin-dashboard/admin-dashboard.component')
        .then(m => m.AdminDashboardComponent),
  },
  {
    path: 'restaurants/:id/menu',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./components/admin-restaurant-menu/admin-restaurant-menu.component')
        .then(m => m.AdminRestaurantMenuComponent),
  },
];
