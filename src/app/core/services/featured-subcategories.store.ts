import { Injectable, inject, signal } from '@angular/core';
import { FeaturedSubcategory, RestaurantService } from './restaurant.service';

/** Placeholder tiles when admin has not featured any subcategory yet. */
export const DUMMY_SUBCATEGORIES: FeaturedSubcategory[] = [
  { id: -1, name: 'Pizza', slug: 'dummy-pizza', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -2, name: 'Burgers', slug: 'dummy-burgers', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -3, name: 'Biryani', slug: 'dummy-biryani', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -4, name: 'Chinese', slug: 'dummy-chinese', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -5, name: 'Momos', slug: 'dummy-momos', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -6, name: 'Thali', slug: 'dummy-thali', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -7, name: 'Sweets', slug: 'dummy-sweets', image_url: null, product_count: 0, restaurant_count: 0 },
  { id: -8, name: 'Drinks', slug: 'dummy-drinks', image_url: null, product_count: 0, restaurant_count: 0 },
];

@Injectable({ providedIn: 'root' })
export class FeaturedSubcategoriesStore {
  private readonly restaurants = inject(RestaurantService);
  private loaded = false;

  readonly items = signal<FeaturedSubcategory[]>([]);
  readonly loading = signal(false);
  readonly usingDummies = signal(true);

  ensureLoaded() {
    if (this.loaded) return;
    this.loaded = true;
    this.loading.set(true);
    this.restaurants.getFeaturedSubcategories().subscribe({
      next: rows => {
        const list = rows?.length ? rows : DUMMY_SUBCATEGORIES;
        this.items.set(list);
        this.usingDummies.set(!rows?.length);
        this.loading.set(false);
      },
      error: () => {
        this.items.set(DUMMY_SUBCATEGORIES);
        this.usingDummies.set(true);
        this.loading.set(false);
      },
    });
  }
}
