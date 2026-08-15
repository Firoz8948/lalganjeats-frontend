import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import {
  RestaurantService,
  PublicMenuItem,
  PublicMenuVariant,
} from '../../../../core/services/restaurant.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { SeoService } from '../../../../core/services/seo.service';

interface RestaurantInfo {
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: string;
  minOrder: string;
  isOpen: boolean;
  address: string;
  emoji: string;
  imageBg: string;
  bannerUrl: string | null;
  logoUrl: string | null;
}

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './restaurant-menu.component.html',
  styleUrl: './restaurant-menu.component.scss',
})
export class RestaurantMenuComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private restaurantService = inject(RestaurantService);
  private customerLocation = inject(CustomerLocationService);
  private seo = inject(SeoService);
  readonly cartService = inject(CartService);

  restaurantId = signal(0);
  activeCategory = signal('All');
  menuItems = signal<PublicMenuItem[]>([]);
  loading = signal(true);
  outOfArea = signal(false);
  selectedVariant = signal<Record<number, number>>({});

  restaurant = signal<RestaurantInfo>({
    name: '', cuisine: '', rating: 4.0, reviewCount: 0,
    deliveryTime: '30-40 min', deliveryFee: 'Free delivery',
    minOrder: '₹100', isOpen: true, address: '',
    emoji: '🍛', imageBg: '#FFF0F0',
    bannerUrl: null, logoUrl: null,
  });

  categories = computed(() => {
    const cats = new Set(this.menuItems().map(i => i.category));
    return ['All', ...cats];
  });

  filteredItems = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'All') return this.menuItems();
    return this.menuItems().filter(i => i.category === cat);
  });

  cartItems = computed(() => this.cartService.itemsFor(this.restaurantId()));
  cartTotal = computed(() => this.cartItems().reduce((s, i) => s + i.price * i.quantity, 0));
  cartItemCount = computed(() => this.cartItems().reduce((s, i) => s + i.quantity, 0));

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/restaurants']);
      return;
    }
    this.restaurantId.set(id);

    const lat = this.customerLocation.latitude();
    const lng = this.customerLocation.longitude();
    if (lat == null || lng == null) {
      this.outOfArea.set(true);
      this.loading.set(false);
      return;
    }

    this.restaurantService.getRestaurant(id, lat, lng).subscribe({
      next: (data) => {
        this.seo.setPage({
          title: `${data.name} Menu & Food Delivery in Lalganj | LalganjEats`,
          description: `Order online from ${data.name} in Lalganj Ajhara. Browse the menu, select sizes and get local food delivered with LalganjEats.`,
        });
        this.restaurant.set({
          name: data.name,
          cuisine: data.cuisine,
          rating: data.rating,
          reviewCount: data.review_count,
          deliveryTime: data.delivery_time,
          deliveryFee: data.delivery_fee,
          minOrder: data.min_order,
          isOpen: data.is_open,
          address: data.address || data.city || '',
          emoji: data.image_emoji,
          imageBg: data.image_bg,
          bannerUrl: data.banner_url || data.list_banner_url || null,
          logoUrl: data.logo_url || null,
        });
      },
      error: () => {
        this.outOfArea.set(true);
        this.loading.set(false);
      },
    });

    this.restaurantService.getRestaurantMenu(id).subscribe({
      next: (items) => {
        this.menuItems.set(items);
        const defaults: Record<number, number> = {};
        for (const item of items) {
          const first = (item.variants || []).find(v => v.is_available) || item.variants?.[0];
          if (first) defaults[item.id] = first.id;
        }
        this.selectedVariant.set(defaults);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setCategory(cat: string) {
    this.activeCategory.set(cat);
  }

  variantsFor(item: PublicMenuItem): PublicMenuVariant[] {
    return item.variants || [];
  }

  selectedVariantFor(item: PublicMenuItem): PublicMenuVariant | null {
    const variants = this.variantsFor(item);
    if (!variants.length) return null;
    const id = this.selectedVariant()[item.id];
    return variants.find(v => v.id === id) || variants.find(v => v.is_available) || variants[0];
  }

  selectVariant(itemId: number, variantId: number) {
    this.selectedVariant.update(m => ({ ...m, [itemId]: variantId }));
  }

  displayPrice(item: PublicMenuItem): number {
    return this.selectedVariantFor(item)?.price ?? item.price;
  }

  displayMrp(item: PublicMenuItem): number | null {
    return this.selectedVariantFor(item)?.original_price ?? item.original_price;
  }

  getCartQuantity(item: PublicMenuItem): number {
    const v = this.selectedVariantFor(item);
    return this.cartService.getQuantity(this.restaurantId(), item.id, v?.id ?? null);
  }

  addToCart(item: PublicMenuItem) {
    const variant = this.selectedVariantFor(item);
    if (this.variantsFor(item).length > 0 && !variant) {
      alert('Choose Half or Full first.');
      return;
    }
    this.cartService.addItem(this.restaurantId(), {
      id: item.id,
      variant_id: variant?.id ?? null,
      variant_label: variant?.label ?? null,
      name: item.name,
      price: variant?.price ?? item.price,
      original_price: variant?.original_price ?? item.original_price,
      is_veg: item.is_veg,
      category: item.category,
    });
  }

  incrementCartItem(item: CartItem) {
    this.cartService.addItem(this.restaurantId(), {
      id: item.id,
      variant_id: item.variant_id ?? null,
      variant_label: item.variant_label ?? null,
      name: item.name,
      price: item.price,
      original_price: item.original_price,
      is_veg: item.is_veg,
      category: item.category,
    });
  }

  removeFromCart(item: PublicMenuItem | CartItem) {
    const variantId =
      'variant_id' in item
        ? (item.variant_id ?? null)
        : (this.selectedVariantFor(item as PublicMenuItem)?.id ?? null);
    this.cartService.removeItem(this.restaurantId(), item.id, variantId);
  }

  goBack() {
    this.router.navigate(['/restaurants']);
  }
}
