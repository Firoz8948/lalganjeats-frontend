import { Routes } from '@angular/router';

export const CHECKOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
];
