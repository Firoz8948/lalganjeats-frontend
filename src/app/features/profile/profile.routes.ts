// frontend/src/app/features/profile/profile.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/profile-shell/profile-shell.component')
        .then(m => m.ProfileShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'info',
        pathMatch: 'full'
      },
      {
        path: 'info',
        loadComponent: () =>
          import('./components/my-profile/my-profile.component')
            .then(m => m.MyProfileComponent)
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./components/my-orders/my-orders.component')
            .then(m => m.MyOrdersComponent)
      },
      {
        path: 'addresses',
        loadComponent: () =>
          import('./components/my-addresses/my-addresses.component')
            .then(m => m.MyAddressesComponent)
      },      {
        path: 'settings',
        loadComponent: () =>
          import('./components/my-settings/my-settings.component')
            .then(m => m.MySettingsComponent)
      }
    ]
  }
];
