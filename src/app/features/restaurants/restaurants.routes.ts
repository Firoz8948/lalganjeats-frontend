import { Routes } from '@angular/router';

export const RESTAURANT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/restaurants-list/restaurants-list.component').then(
        m => m.RestaurantsListComponent
      ),
  },
  {
    path: ':slug',
    loadComponent: () =>
      import('./components/restaurant-menu/restaurant-menu.component').then(
        m => m.RestaurantMenuComponent
      ),
  },
];
