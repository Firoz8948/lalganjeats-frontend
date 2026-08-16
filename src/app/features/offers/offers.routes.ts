import { Routes } from '@angular/router';

export const OFFERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./offers.component').then(m => m.OffersComponent),
  },
];
