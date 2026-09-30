import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { CatalogProduct, ProductShelf, RestaurantService } from '../../../../core/services/restaurant.service';
import { HOME_CATEGORIES, HomeCategoryKey } from '../../home-categories';
import { ProductCardComponent } from '../product-card/product-card.component';

/** Grocery Panel sections: one horizontal product row each, ending in "View all". */
@Component({
  selector: 'app-product-shelves',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './product-shelves.component.html',
  styleUrl: './product-shelves.component.scss',
})
export class ProductShelvesComponent {
  readonly category = input.required<HomeCategoryKey>();

  private readonly restaurants = inject(RestaurantService);
  private readonly customerLocation = inject(CustomerLocationService);

  readonly shelves = signal<ProductShelf[]>([]);
  private requestKey = '';

  constructor() {
    effect(() => {
      const key = this.category();
      const loc = this.customerLocation.location();
      untracked(() => this.load(key, loc?.lat ?? null, loc?.lng ?? null));
    });
  }

  viewAllLink(shelf: ProductShelf): (string | number)[] {
    return ['/home/shop', this.category(), shelf.view_all_subcategory_id ?? 'all'];
  }

  productLink(product: CatalogProduct): (string | number)[] {
    return ['/home/shop', this.category(), product.subcategory_id ?? 'all'];
  }

  private load(key: HomeCategoryKey, lat: number | null, lng: number | null) {
    const categoryId = HOME_CATEGORIES.find((c) => c.key === key)!.categoryId;
    const requestKey = `${categoryId}:${lat}:${lng}`;
    this.requestKey = requestKey;
    if (lat == null || lng == null) {
      this.shelves.set([]);
      return;
    }
    this.restaurants.getShelves(categoryId, lat, lng).subscribe({
      next: (rows) => {
        if (this.requestKey === requestKey) this.shelves.set(rows ?? []);
      },
      error: () => {
        if (this.requestKey === requestKey) this.shelves.set([]);
      },
    });
  }
}
