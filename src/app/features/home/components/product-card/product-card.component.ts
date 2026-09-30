import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCartService } from '../../../../core/services/product-cart.service';
import { CatalogProduct } from '../../../../core/services/restaurant.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  readonly product = input.required<CatalogProduct>();
  /** Where tapping the image or name goes; the card is not a link when null. */
  readonly link = input<(string | number)[] | null>(null);
  /** Optional colours from the Grocery Panel section. */
  readonly imageBg = input<string | null>(null);
  readonly bodyBg = input<string | null>(null);

  private readonly productCart = inject(ProductCartService);

  readonly quantity = computed(() => this.productCart.quantity(this.product()));
  readonly hasMrp = computed(() => {
    const p = this.product();
    return !!p.original_price && p.original_price > p.price;
  });

  add() {
    this.productCart.add(this.product());
  }

  remove() {
    this.productCart.remove(this.product());
  }
}
