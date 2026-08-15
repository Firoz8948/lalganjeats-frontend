import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';
import { getDefaultLandingPath } from '../../core/utils/client-channel';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard('customer', getDefaultLandingPath())],
    loadComponent: () =>
      import('./components/customer-login/customer-login.component').then(
        m => m.CustomerLoginComponent
      ),
  },
  {
    path: 'hotel-login',
    canActivate: [guestGuard('restaurant_owner', '/hotel-portal/dashboard')],
    loadComponent: () =>
      import('./components/hotel-login/hotel-login.component').then(
        m => m.HotelLoginComponent
      ),
  },
  {
    path: 'delivery-login',
    canActivate: [guestGuard('delivery_partner', '/deliverypartner')],
    loadComponent: () =>
      import('./components/delivery-login/delivery-login.component').then(
        m => m.DeliveryLoginComponent
      ),
  },
  {
    path: 'admin-login',
    canActivate: [guestGuard('admin', '/admin/dashboard')],
    loadComponent: () =>
      import('../admin-portal/components/admin-login/admin-login.component')
        .then(m => m.AdminLoginComponent),
  },
  {
    path: 'superadmin-login',
    canActivate: [guestGuard('super_admin', '/superadmin/dashboard')],
    loadComponent: () =>
      import('../superadmin-portal/components/superadmin-login/superadmin-login.component')
        .then(m => m.SuperadminLoginComponent),
  },
];
