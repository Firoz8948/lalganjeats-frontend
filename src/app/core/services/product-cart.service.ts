import { Injectable, inject, signal } from '@angular/core';
import { CartService } from './cart.service';
import { CatalogProduct } from './restaurant.service';
import { storeCategoryKey } from '../../features/home/home-categories';

/** One-tap Buy / quantity stepper for product cards outside a store's menu page. */
@Injectable({ providedIn: 'root' })
export class ProductCartService {
  private readonly cart = inject(CartService);

  /** Product whose Buy hit a cart from another store; the conflict dialog resolves it. */
  readonly pending = signal<CatalogProduct | null>(null);
  readonly cartStoreName = () => this.cart.cart()?.restaurantName || 'another store';

  quantity(product: CatalogProduct): number {
    return this.cart.getQuantity(product.restaurant.id, product.id, product.variant_id);
  }

  add(product: CatalogProduct): void {
    const result = this.cart.addItem(product.restaurant.id, {
      id: product.id,
      variant_id: product.variant_id,
      variant_label: product.variant_label,
      name: product.name,
      price: product.price,
      original_price: product.original_price,
      is_veg: product.is_veg,
      category: product.category,
      image_url: product.image_url,
    }, product.restaurant.name, storeCategoryKey(product.restaurant));
    if (result === 'conflict') this.pending.set(product);
  }

  remove(product: CatalogProduct): void {
    this.cart.removeItem(product.restaurant.id, product.id, product.variant_id);
  }

  replaceCartWithPending(): void {
    const product = this.pending();
    if (!product) return;
    this.cart.clearCart();
    this.pending.set(null);
    this.add(product);
  }

  dismissPending(): void {
    this.pending.set(null);
  }
}
