import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { RestaurantService, PublicMenuItem } from '../../../../core/services/restaurant.service';
import { CartService, CartItem } from '../../../../core/services/cart.service';

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
  private route              = inject(ActivatedRoute);
  private router             = inject(Router);
  private restaurantService  = inject(RestaurantService);
  readonly cartService       = inject(CartService);

  restaurantId = signal(0);
  activeCategory = signal('All');
  menuItems = signal<PublicMenuItem[]>([]);
  loading = signal(true);

  restaurant = signal<RestaurantInfo>({
    name: '', cuisine: '', rating: 4.0, reviewCount: 0,
    deliveryTime: '30-40 min', deliveryFee: 'Free delivery',
    minOrder: '₹100', isOpen: true, address: 'Lalganj, UP',
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
    if (!id) { this.router.navigate(['/restaurants']); return; }
    this.restaurantId.set(id);

    this.restaurantService.getRestaurant(id).subscribe({
      next: (data) => {
        this.restaurant.set({
          name:         data.name,
          cuisine:      data.cuisine,
          rating:       data.rating,
          reviewCount:  data.review_count,
          deliveryTime: data.delivery_time,
          deliveryFee:  data.delivery_fee,
          minOrder:     data.min_order,
          isOpen:       data.is_open,
          address:      data.address || data.city || 'Lalganj, UP',
          emoji:        data.image_emoji,
          imageBg:      data.image_bg,
          bannerUrl:    data.banner_url || data.list_banner_url || null,
          logoUrl:      data.logo_url || null,
        });
      },
      error: () => {},
    });

    this.restaurantService.getRestaurantMenu(id).subscribe({
      next: (items) => {
        this.menuItems.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setCategory(cat: string) { this.activeCategory.set(cat); }

  getCartQuantity(itemId: number): number {
    return this.cartService.getQuantity(this.restaurantId(), itemId);
  }

  addToCart(item: PublicMenuItem) {
    this.cartService.addItem(this.restaurantId(), {
      id:             item.id,
      name:           item.name,
      price:          item.price,
      original_price: item.original_price,
      is_veg:         item.is_veg,
      category:       item.category,
    });
  }

  incrementCartItem(item: CartItem) {
    this.cartService.addItem(this.restaurantId(), {
      id:             item.id,
      name:           item.name,
      price:          item.price,
      original_price: item.original_price,
      is_veg:         item.is_veg,
      category:       item.category,
    });
  }

  removeFromCart(itemId: number) {
    this.cartService.removeItem(this.restaurantId(), itemId);
  }

  goBack() { this.router.navigate(['/restaurants']); }
}
