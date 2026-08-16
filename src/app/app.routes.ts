// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { getDefaultLandingPath } from './core/utils/client-channel';

const defaultLanding = getDefaultLandingPath().replace(/^\//, ''); // 'home' | 'profile'

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: defaultLanding,
  },

  {
    path: 'home',
    loadChildren: () =>
      import('./features/home/home.routes').then(m => m.HOME_ROUTES),
  },

  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },

  {
    path: 'cart',
    redirectTo: 'checkout',
    pathMatch: 'full',
  },

  {
    path: 'checkout',
    loadChildren: () =>
      import('./features/checkout/checkout.routes').then(m => m.CHECKOUT_ROUTES),
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES),
  },

  {
    path: 'tracking',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/tracking/tracking.routes').then(m => m.TRACKING_ROUTES),
  },

  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin-portal/admin-portal.routes')
        .then(m => m.ADMIN_PORTAL_ROUTES),
  },

  {
    path: 'superadmin',
    loadChildren: () =>
      import('./features/superadmin-portal/superadmin-portal.routes')
        .then(m => m.SUPERADMIN_PORTAL_ROUTES),
  },

  {
    path: 'restaurants',
    loadChildren: () =>
      import('./features/restaurants/restaurants.routes').then(m => m.RESTAURANT_ROUTES),
  },

  {
    path: 'offers',
    loadChildren: () =>
      import('./features/offers/offers.routes').then(m => m.OFFERS_ROUTES),
  },

  {
    path: 'legal',
    loadChildren: () =>
      import('./features/legal/legal.routes').then(m => m.LEGAL_ROUTES),
  },

  // Legacy alias — old /hotels links still work
  {
    path: 'hotels',
    loadChildren: () =>
      import('./features/restaurants/restaurants.routes').then(m => m.RESTAURANT_ROUTES),
  },

  {
    path: 'hotel-portal',
    loadChildren: () =>
      import('./features/hotel-portal/hotel-portal.routes')
        .then(m => m.HOTEL_PORTAL_ROUTES),
  },

  {
    path: 'deliverypartner',
    loadChildren: () =>
      import('./features/delivery-portal/delivery-portal.routes')
        .then(m => m.DELIVERY_PORTAL_ROUTES),
  },

  { path: '**', redirectTo: defaultLanding },
];
