import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeaturedSubcategoriesStore } from '../../../../core/services/featured-subcategories.store';
import { FeaturedSubcategory } from '../../../../core/services/restaurant.service';

@Component({
  selector: 'app-featured-subcategories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './featured-subcategories.component.html',
  styleUrl: './featured-subcategories.component.scss',
  host: {
    '[class.is-mobile]': 'layout === "mobile"',
    '[class.is-desktop]': 'layout === "desktop"',
    '[attr.aria-hidden]': 'false',
  },
})
export class FeaturedSubcategoriesComponent implements OnInit {
  /** mobile = inside banner container; desktop = below banners */
  @Input() layout: 'mobile' | 'desktop' = 'desktop';

  store = inject(FeaturedSubcategoriesStore);

  ngOnInit() {
    this.store.ensureLoaded();
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
