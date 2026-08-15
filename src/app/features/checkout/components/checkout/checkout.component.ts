import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { OrderService, PlaceOrderPayload, PlaceOrderResult } from '../../../../core/services/order.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { ProfileService, Address } from '../../../profile/services/profile.service';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  private cart = inject(CartService);
  private orders = inject(OrderService);
  private profile = inject(ProfileService);
  private customerLocation = inject(CustomerLocationService);
  private restaurants = inject(RestaurantService);
  private router = inject(Router);

  addresses = signal<Address[]>([]);
  selectedAddressId = signal<number | null>(null);
  paymentMethod: 'cash' | 'online' = 'cash';
  notes = '';
  newAddress = '';
  placing = signal(false);
  error = signal('');
  success = signal<{ order_number: string; eta_minutes: number | null; distance_km: number | null } | null>(null);
  deliveryCharge = signal(0);

  cartData = this.cart.cart;
  totalAmount = this.cart.totalAmount;
  grandTotal = computed(() => this.totalAmount() + this.deliveryCharge());

  ngOnInit() {
    if (!this.cartData()) {
      this.router.navigateByUrl('/home');
      return;
    }
    const cart = this.cartData();
    const location = this.customerLocation.location();
    if (cart && location) {
      this.restaurants
        .getRestaurant(cart.restaurantId, location.lat, location.lng)
        .subscribe({
          next: restaurant =>
            this.deliveryCharge.set(restaurant.delivery_charge || 0),
        });
    }
    this.profile.getAddresses().subscribe({
      next: (list: Address[]) => {
        this.addresses.set(list);
        const def = list.find((a: Address) => a.is_default) || list[0];
        if (def) this.selectedAddressId.set(def.id);
      },
    });
  }

  placeOrder() {
    const c = this.cartData();
    if (!c) return;
    this.error.set('');
    this.placing.set(true);

    const loc = this.customerLocation.location();
    const payload: PlaceOrderPayload = {
      restaurant_id: c.restaurantId,
      payment_method: this.paymentMethod,
      notes: this.notes || null,
      items: c.items.map((i: CartItem) => ({
        menu_item_id: i.id,
        quantity: i.quantity,
        variant_id: i.variant_id ?? null,
      })),
      delivery_latitude: loc?.lat ?? null,
      delivery_longitude: loc?.lng ?? null,
    };

    if (this.selectedAddressId()) {
      payload.address_id = this.selectedAddressId();
    } else if (this.newAddress.trim()) {
      payload.delivery_address = this.newAddress.trim();
    } else {
      this.placing.set(false);
      this.error.set('Choose or add a delivery address.');
      return;
    }

    if (payload.delivery_latitude == null || payload.delivery_longitude == null) {
      this.placing.set(false);
      this.error.set('Choose your exact location from the top bar first.');
      return;
    }

    this.orders.placeOrder(payload).subscribe({
      next: (res: PlaceOrderResult) => {
        this.placing.set(false);
        this.cart.clearCart();
        this.success.set({
          order_number: res.order_number,
          eta_minutes: res.eta_minutes,
          distance_km: res.distance_km,
        });
      },
      error: (err: { error?: { detail?: string } }) => {
        this.placing.set(false);
        this.error.set(err.error?.detail || 'Failed to place order.');
      },
    });
  }
}
