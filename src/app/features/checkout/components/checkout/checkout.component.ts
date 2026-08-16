import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { OrderService, PlaceOrderPayload, PlaceOrderResult } from '../../../../core/services/order.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentSettingsService } from '../../../../core/services/payment-settings.service';
import {
  PromoService,
  PromoValidateResult,
  PublicPromo,
} from '../../../../core/services/promo.service';
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
  private auth = inject(AuthService);
  private paymentSettings = inject(PaymentSettingsService);
  private promos = inject(PromoService);
  private router = inject(Router);

  addresses = signal<Address[]>([]);
  selectedAddressId = signal<number | null>(null);
  paymentMethod: 'cash' | 'online' = 'cash';
  notes = '';
  newAddress = '';
  promoCode = '';
  placing = signal(false);
  applyingPromo = signal(false);
  error = signal('');
  promoMessage = signal('');
  success = signal<{ order_number: string; eta_minutes: number | null; distance_km: number | null } | null>(null);
  deliveryCharge = signal(0);
  platformCharge = signal(2);
  allowPrepaid = signal(true);
  allowCod = signal(true);
  codMaxAmount = signal(500);
  discountAmount = signal(0);
  freeDeliveryApplied = signal(false);
  appliedPromoCode = signal<string | null>(null);
  publicPromos = signal<PublicPromo[]>([]);
  showAppPromoPopup = signal(false);

  cartData = this.cart.cart;
  totalAmount = this.cart.totalAmount;
  effectiveDelivery = computed(() =>
    this.freeDeliveryApplied() ? 0 : this.deliveryCharge(),
  );
  grandTotal = computed(() =>
    Math.max(
      0,
      this.totalAmount() + this.effectiveDelivery() + this.platformCharge() - this.discountAmount(),
    ),
  );
  codAvailable = computed(() =>
    this.allowCod() && this.grandTotal() < this.codMaxAmount(),
  );
  isLoggedIn = this.auth.isLoggedIn;

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
    this.paymentSettings.getPublicSettings().subscribe({
      next: settings => {
        this.platformCharge.set(Number(settings.platform_charge_rupees) || 0);
        this.allowPrepaid.set(settings.allow_prepaid_orders !== false);
        this.allowCod.set(settings.allow_cod_orders !== false);
        this.codMaxAmount.set(Number(settings.cod_max_order_amount) || 500);
        if (!this.codAvailable() && this.allowPrepaid()) {
          this.paymentMethod = 'online';
        } else if (!this.allowPrepaid() && this.codAvailable()) {
          this.paymentMethod = 'cash';
        }
      },
      error: () => this.platformCharge.set(2),
    });
    this.promos.listActive().subscribe({
      next: rows => this.publicPromos.set(rows),
    });
    if (this.isLoggedIn()) {
      this.loadAddresses();
    }
  }

  private loadAddresses() {
    this.profile.getAddresses().subscribe({
      next: (list: Address[]) => {
        this.addresses.set(list);
        const def = list.find((a: Address) => a.is_default) || list[0];
        if (def) this.selectedAddressId.set(def.id);
      },
    });
  }

  usePublicPromo(code: string) {
    this.promoCode = code;
    this.applyPromo();
  }

  applyPromo() {
    const code = this.promoCode.trim();
    if (!code) {
      this.promoMessage.set('Enter a promo code.');
      return;
    }
    this.applyingPromo.set(true);
    this.promoMessage.set('');
    this.error.set('');
    this.promos
      .validate(code, {
        subtotal: this.totalAmount(),
        delivery_fee: this.deliveryCharge(),
      })
      .subscribe({
        next: (result: PromoValidateResult) => {
          this.applyingPromo.set(false);
          if (result.download_required) {
            this.clearPromoBenefits();
            this.showAppPromoPopup.set(true);
            this.promoMessage.set(result.message);
            return;
          }
          if (!result.valid) {
            this.clearPromoBenefits();
            this.promoMessage.set(result.message || 'Invalid promocode');
            return;
          }
          this.appliedPromoCode.set(result.code || code.toUpperCase());
          this.discountAmount.set(Number(result.discount_amount) || 0);
          this.freeDeliveryApplied.set(!!result.free_delivery);
          this.promoMessage.set(result.message || 'Promocode applied');
        },
        error: () => {
          this.applyingPromo.set(false);
          this.clearPromoBenefits();
          this.promoMessage.set('Could not verify promocode.');
        },
      });
  }

  clearPromoBenefits() {
    this.appliedPromoCode.set(null);
    this.discountAmount.set(0);
    this.freeDeliveryApplied.set(false);
  }

  onPrimaryAction() {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
      return;
    }
    this.placeOrder();
  }

  placeOrder() {
    const c = this.cartData();
    if (!c) return;
    this.error.set('');
    if (this.paymentMethod === 'cash' && !this.codAvailable()) {
      this.error.set(
        `Cash on delivery is available only below ₹${this.codMaxAmount()}. Choose prepaid payment.`,
      );
      return;
    }
    if (this.paymentMethod === 'online' && !this.allowPrepaid()) {
      this.error.set('Prepaid orders are currently unavailable.');
      return;
    }
    this.placing.set(true);

    const loc = this.customerLocation.location();
    const payload: PlaceOrderPayload = {
      restaurant_id: c.restaurantId,
      payment_method: this.paymentMethod,
      notes: this.notes || null,
      promo_code: this.appliedPromoCode() || this.promoCode.trim() || null,
      client_channel: this.promos.clientChannel,
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
      error: (err: { error?: { detail?: any } }) => {
        this.placing.set(false);
        const detail = err.error?.detail;
        if (detail && typeof detail === 'object') {
          if (detail.download_required) {
            this.showAppPromoPopup.set(true);
          }
          this.error.set(detail.message || 'Failed to place order.');
          return;
        }
        this.error.set(
          typeof detail === 'string' ? detail : 'Failed to place order.',
        );
      },
    });
  }
}
