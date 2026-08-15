import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const TRACKING_ROUTES: Routes = [
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/track-order/track-order.component').then(
        (m) => m.TrackOrderComponent
      ),
  },
];
