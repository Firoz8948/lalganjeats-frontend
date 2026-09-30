import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';

const BODY_CLASS = 'has-cart-float';

/** "N items added · View cart" bar for grocery carts, pinned above the mobile bottom navigation. */
@Component({
  selector: 'app-cart-float-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cart-float-bar.component.html',
  styleUrl: './cart-float-bar.component.scss',
})
export class CartFloatBarComponent {
  private readonly cart = inject(CartService);
  private readonly body = inject(DOCUMENT).body;

  private readonly isGroceryCart = computed(() => this.cart.cart()?.storeCategory === 'grocery');
  readonly count = computed(() => (this.isGroceryCart() ? this.cart.totalItems() : 0));
  readonly total = this.cart.totalAmount;
  readonly label = computed(() => `${this.count()} ${this.count() === 1 ? 'item' : 'items'} added`);

  constructor() {
    effect(() => this.body.classList.toggle(BODY_CLASS, this.count() > 0));
    inject(DestroyRef).onDestroy(() => this.body.classList.remove(BODY_CLASS));
  }
}
