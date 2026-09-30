import { Restaurant } from '../../core/models/restaurant.model';

export type HomeCategoryKey = 'food' | 'grocery';

export interface HomeCategory {
  key: HomeCategoryKey;
  label: string;
  /** catalog_categories.id in production (1 = Restaurant, 2 = Grocery). */
  categoryId: number;
}

export const HOME_CATEGORIES: readonly HomeCategory[] = [
  { key: 'food', label: 'Food', categoryId: 1 },
  { key: 'grocery', label: 'Grocery', categoryId: 2 },
];

export const DEFAULT_HOME_CATEGORY: HomeCategoryKey = 'food';

export function parseHomeCategory(value: string | null | undefined): HomeCategoryKey {
  return HOME_CATEGORIES.some((c) => c.key === value)
    ? (value as HomeCategoryKey)
    : DEFAULT_HOME_CATEGORY;
}

/** Stores without a known business category belong to Food. */
export function storeCategoryKey(
  restaurant: Pick<Restaurant, 'business_category_id'>,
): HomeCategoryKey {
  const match = HOME_CATEGORIES.find(
    (c) => c.categoryId === restaurant.business_category_id,
  );
  return match?.key ?? DEFAULT_HOME_CATEGORY;
}

export function homeCategoryLabel(key: HomeCategoryKey): string {
  return HOME_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
