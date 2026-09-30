import { Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeaturedSubcategoriesStore } from '../../../../core/services/featured-subcategories.store';
import { FeaturedSubcategory } from '../../../../core/services/restaurant.service';
import { DEFAULT_HOME_CATEGORY, HomeCategoryKey, homeCategoryLabel } from '../../home-categories';

@Component({
  selector: 'app-featured-subcategories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './featured-subcategories.component.html',
  styleUrl: './featured-subcategories.component.scss',
  host: {
    '[class.is-mobile]': 'layout === "mobile"',
    '[class.is-desktop]': 'layout === "desktop"',
    '[class.is-grocery]': 'categoryKey() === "grocery"',
    '[attr.aria-hidden]': 'false',
  },
})
export class FeaturedSubcategoriesComponent {
  /** mobile = inside banner container; desktop = below banners */
  @Input() layout: 'mobile' | 'desktop' = 'desktop';

  /** Home tab whose featured subcategories are shown. */
  @Input() set category(value: HomeCategoryKey | null | undefined) {
    const key = value ?? DEFAULT_HOME_CATEGORY;
    this.categoryKey.set(key);
    this.store.ensureLoaded(key);
  }

  private readonly store = inject(FeaturedSubcategoriesStore);
  readonly categoryKey = signal<HomeCategoryKey>(DEFAULT_HOME_CATEGORY);

  readonly items = computed(() => this.store.items(this.categoryKey()));
  readonly usingDummies = computed(() => this.store.usingDummies(this.categoryKey()));
  readonly ariaLabel = computed(() => `${homeCategoryLabel(this.categoryKey())} categories`);

  constructor() {
    this.store.ensureLoaded(DEFAULT_HOME_CATEGORY);
  }

  /** Food tiles list restaurants serving that subcategory; other tabs open the product browser. */
  link(item: FeaturedSubcategory): { commands: unknown[]; queryParams: Record<string, unknown> | null } {
    const key = this.categoryKey();
    if (key === 'food') {
      return { commands: ['/restaurants'], queryParams: { subcategory_id: item.id, name: item.name } };
    }
    return { commands: ['/home/shop', key, item.id], queryParams: null };
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  trackById(_: number, item: FeaturedSubcategory) {
    return item.id;
  }
}
