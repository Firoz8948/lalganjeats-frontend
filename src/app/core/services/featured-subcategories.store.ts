import { Injectable, inject, signal } from '@angular/core';
import { FeaturedSubcategory, RestaurantService } from './restaurant.service';
import {
  HOME_CATEGORIES,
  HomeCategoryKey,
} from '../../features/home/home-categories';

function dummies(names: string[]): FeaturedSubcategory[] {
  return names.map((name, i) => ({
    id: -(i + 1),
    name,
    slug: `dummy-${name.toLowerCase().replace(/\W+/g, '-')}`,
    image_url: null,
    product_count: 0,
    restaurant_count: 0,
  }));
}

/** Placeholder tiles per tab when admin has not featured any subcategory yet. */
export const DUMMY_SUBCATEGORIES: Record<HomeCategoryKey, FeaturedSubcategory[]> = {
  food: dummies(['Pizza', 'Burgers', 'Biryani', 'Chinese', 'Momos', 'Thali', 'Sweets', 'Drinks']),
  grocery: dummies(['Atta & Flour', 'Rice', 'Dal & Pulses', 'Oil & Ghee', 'Spices', 'Snacks', 'Dairy', 'Beverages']),
};

interface CategoryState {
  items: FeaturedSubcategory[];
  usingDummies: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeaturedSubcategoriesStore {
  private readonly restaurants = inject(RestaurantService);
  private readonly requested = new Set<HomeCategoryKey>();
  private readonly state = signal<Partial<Record<HomeCategoryKey, CategoryState>>>({});

  ensureLoaded(key: HomeCategoryKey) {
    if (this.requested.has(key)) return;
    this.requested.add(key);
    const categoryId = HOME_CATEGORIES.find((c) => c.key === key)!.categoryId;
    this.restaurants.getFeaturedSubcategories(categoryId).subscribe({
      next: (rows) => this.set(key, rows?.length ? rows : null),
      error: () => this.set(key, null),
    });
  }

  /** Reactive read — call inside a computed/template. */
  items(key: HomeCategoryKey): FeaturedSubcategory[] {
    return this.state()[key]?.items ?? DUMMY_SUBCATEGORIES[key];
  }

  usingDummies(key: HomeCategoryKey): boolean {
    return this.state()[key]?.usingDummies ?? true;
  }

  private set(key: HomeCategoryKey, rows: FeaturedSubcategory[] | null) {
    this.state.update((s) => ({
      ...s,
      [key]: { items: rows ?? DUMMY_SUBCATEGORIES[key], usingDummies: !rows },
    }));
  }
}
