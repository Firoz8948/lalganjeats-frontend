import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProductCartService } from '../../core/services/product-cart.service';

/** Shown when a product card's Buy would mix stores in one cart. Place once per page. */
@Component({
  selector: 'app-cart-conflict-dialog',
  standalone: true,
  templateUrl: './cart-conflict-dialog.component.html',
  styleUrl: './cart-conflict-dialog.component.scss',
})
export class CartConflictDialogComponent {
  protected readonly productCart = inject(ProductCartService);
  private readonly router = inject(Router);

  goToCheckout() {
    this.productCart.dismissPending();
    this.router.navigate(['/checkout']);
  }
}
