import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HomeCategoryKey } from '../../features/home/home-categories';

const THEME_CLASSES: Record<HomeCategoryKey, string> = {
  food: 'theme-food',
  grocery: 'theme-grocery',
};

/**
 * Puts the active shop tab's theme class on <body>. Several pages can hold a theme
 * at once during route transitions; the most recent holder wins.
 */
@Injectable({ providedIn: 'root' })
export class ShopThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly holders = new Map<object, HomeCategoryKey>();

  apply(owner: object, key: HomeCategoryKey) {
    this.holders.delete(owner);
    this.holders.set(owner, key);
    this.render();
  }

  release(owner: object) {
    this.holders.delete(owner);
    this.render();
  }

  private render() {
    const active = [...this.holders.values()].pop();
    for (const [key, cls] of Object.entries(THEME_CLASSES)) {
      this.document.body.classList.toggle(cls, key === active);
    }
  }
}
