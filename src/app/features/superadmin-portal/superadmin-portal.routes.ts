import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const SUPERADMIN_PORTAL_ROUTES: Routes = [
  // /superadmin → dashboard (roleGuard sends guests to /auth/superadmin-login)
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [roleGuard('super_admin')],
    loadComponent: () =>
      import('./components/superadmin-dashboard/superadmin-dashboard.component')
        .then(m => m.SuperadminDashboardComponent),
  },
];
