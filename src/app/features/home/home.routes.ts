import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'shop/:category/:subcategoryId',
    loadComponent: () =>
      import('./components/category-products/category-products.component')
        .then(m => m.CategoryProductsComponent),
  },
];
