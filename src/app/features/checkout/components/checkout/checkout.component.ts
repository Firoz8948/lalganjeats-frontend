import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { OrderService, PlaceOrderPayload, PlaceOrderResult } from '../../../../core/services/order.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PaymentSettingsService } from '../../../../core/services/payment-settings.service';
import {
  PromoService,
  PromoValidateResult,
  PublicPromo,
} from '../../../../core/services/promo.service';
import { ProfileService, Address, CustomerProfile } from '../../../profile/services/profile.service';
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
  private checkoutPay = inject(CheckoutService);
  private profile = inject(ProfileService);
  private customerLocation = inject(CustomerLocationService);
  private restaurants = inject(RestaurantService);
  private auth = inject(AuthService);
  private paymentSettings = inject(PaymentSettingsService);
  private promos = inject(PromoService);
  private router = inject(Router);

  // Address & Recipient State
  addresses = signal<Address[]>([]);
  selectedAddressId = signal<number | null>(null);
  recipientMode: 'self' | 'someone_else' = 'self';
  hasSavedProfile = signal(false);

  // Delivery details form
  fullName = '';
  phone = '';
  email = '';
  deliveryAddressText = '';
  landmark = '';

  // Someone else form
  recipientName = '';
  recipientPhone = '';

  paymentMethod: 'cash' | 'online' = 'cash';
  notes = '';
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

  selectPayment(method: 'cash' | 'online') {
    if (method === 'cash' && !this.codAvailable()) return;
    if (method === 'online' && !this.allowPrepaid()) return;
    this.paymentMethod = method;
  }

  ngOnInit() {
    window.scrollTo(0, 0);
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
      this.loadProfileAndAddresses();
    }
  }

  private isPlaceholderName(name: string): boolean {
    if (!name || !name.trim()) return true;
    return /^cust\s*\d+$/i.test(name.trim()) || /^user\s*\d+$/i.test(name.trim());
  }

  private isPlaceholderEmail(email: string): boolean {
    if (!email || !email.trim()) return true;
    return email.includes('@temp') || email.includes('@placeholder') || email.startsWith('cust_');
  }

  private loadProfileAndAddresses() {
    // Load profile
    this.profile.getProfile().subscribe({
      next: (prof: CustomerProfile) => {
        if (prof) {
          const validName = prof.full_name && !this.isPlaceholderName(prof.full_name);
          if (validName) {
            this.fullName = prof.full_name;
            this.hasSavedProfile.set(true);
          }
          if (prof.email && !this.isPlaceholderEmail(prof.email)) {
            this.email = prof.email;
          }
          this.phone = prof.phone || this.auth.currentUser()?.phone || '';
        }
      },
    });

    // Load addresses
    this.profile.getAddresses().subscribe({
      next: (list: Address[]) => {
        this.addresses.set(list);
        const def = list.find((a: Address) => a.is_default) || list[0];
        if (def) {
          this.selectedAddressId.set(def.id);
          this.deliveryAddressText = def.full_address || '';
          this.landmark = def.landmark || '';
        }
      },
    });
  }

  onSelectSavedAddress(a: Address) {
    this.selectedAddressId.set(a.id);
    this.deliveryAddressText = a.full_address || '';
    this.landmark = a.landmark || '';
  }

  onChooseNewAddress() {
    this.selectedAddressId.set(null);
    this.deliveryAddressText = '';
    this.landmark = '';
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
      try {
        sessionStorage.setItem('le_return_url', '/checkout');
      } catch {
        /* ignore */
      }
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
      return;
    }
    this.placeOrder();
  }

  private startPayU(orderId: number) {
    this.checkoutPay.initiatePayU(orderId).subscribe({
      next: (pay) => {
        try {
          sessionStorage.setItem('le_pending_payu_order', String(orderId));
        } catch {
          /* ignore */
        }
        this.checkoutPay.redirectToPayU(pay.payment_url, pay.fields);
      },
      error: (err: { error?: { detail?: string } }) => {
        this.placing.set(false);
        this.error.set(
          err.error?.detail || 'Could not start PayU payment. Try again.',
        );
      },
    });
  }

  placeOrder() {
    const c = this.cartData();
    if (!c) return;
    this.error.set('');

    // Validation
    if (this.recipientMode === 'self') {
      if (!this.fullName.trim()) {
        this.error.set('Please enter your full name.');
        return;
      }
      if (!this.deliveryAddressText.trim()) {
        this.error.set('Please enter your complete delivery address.');
        return;
      }
    } else {
      if (!this.recipientName.trim()) {
        this.error.set("Please enter recipient's name.");
        return;
      }
      if (!this.recipientPhone.trim() || this.recipientPhone.replace(/\D/g, '').length < 10) {
        this.error.set("Please enter a valid 10-digit recipient mobile number.");
        return;
      }
      if (!this.deliveryAddressText.trim()) {
        this.error.set('Please enter the delivery address.');
        return;
      }
    }

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

    // Auto-update profile in background if self mode and not saved
    if (this.recipientMode === 'self') {
      this.profile.updateProfile({
        full_name: this.fullName.trim(),
        email: this.email.trim() || null,
      }).subscribe({
        error: (err: any) => {
          if (err.error?.detail && typeof err.error.detail === 'string') {
            console.warn('Profile update note:', err.error.detail);
          }
        }
      });
    }

    const loc = this.customerLocation.location();
    let finalDeliveryAddress = this.deliveryAddressText.trim();
    if (this.landmark.trim()) {
      finalDeliveryAddress += ` (Landmark: ${this.landmark.trim()})`;
    }
    if (this.recipientMode === 'someone_else') {
      finalDeliveryAddress = `[For: ${this.recipientName.trim()} | Mob: ${this.recipientPhone.trim()}] ${finalDeliveryAddress}`;
      // Save under My Addresses for someone else
      this.profile.addAddress({
        label: `For ${this.recipientName.trim()}`,
        full_address: this.deliveryAddressText.trim(),
        landmark: this.landmark.trim() || null,
        city: 'Lalganj',
        is_default: false,
      }).subscribe({ error: () => {} });
    }

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
      delivery_address: finalDeliveryAddress,
      delivery_latitude: loc?.lat ?? null,
      delivery_longitude: loc?.lng ?? null,
    };

    if (payload.delivery_latitude == null || payload.delivery_longitude == null) {
      this.placing.set(false);
      this.error.set('Choose your exact location from the top bar first.');
      return;
    }

    this.orders.placeOrder(payload).subscribe({
      next: (res: PlaceOrderResult) => {
        if (res.needs_payment || (res.payment_method === 'online' && res.payment_status !== 'paid')) {
          this.startPayU(res.id);
          return;
        }
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
