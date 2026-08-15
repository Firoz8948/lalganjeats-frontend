// frontend/src/app/core/services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface CartMenuItem {
  id:             number;
  name:           string;
  price:          number;
  original_price: number | null;
  is_veg:         boolean;
  category:       string;
}

export interface CartItem extends CartMenuItem {
  quantity: number;
}

export interface CartData {
  restaurantId: number;
  items:        CartItem[];
}

const CART_KEY = 'le_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _cart = signal<CartData | null>(this._load());

  /** Total item count across cart (used by navbar badge) */
  totalItems = computed(() =>
    this._cart()?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  );

  /** Total monetary value of cart */
  totalAmount = computed(() =>
    this._cart()?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0
  );

  /** Current cart data (null if empty) */
  cart = computed(() => this._cart());

  /** Items for a given restaurant (empty array if different restaurant) */
  itemsFor(restaurantId: number): CartItem[] {
    const c = this._cart();
    if (!c || c.restaurantId !== restaurantId) return [];
    return c.items;
  }

  /** Quantity of a specific item */
  getQuantity(restaurantId: number, itemId: number): number {
    return this.itemsFor(restaurantId).find(i => i.id === itemId)?.quantity ?? 0;
  }

  addItem(restaurantId: number, item: CartMenuItem) {
    const current = this._cart();

    // If cart belongs to a different restaurant, start fresh
    if (current && current.restaurantId !== restaurantId) {
      const confirmed = confirm(
        'Your cart has items from another restaurant. Clear cart and add this item?'
      );
      if (!confirmed) return;
    }

    const existing = current?.restaurantId === restaurantId ? current : null;
    const items = existing ? existing.items : [];

    const idx = items.findIndex(i => i.id === item.id);
    const newItems: CartItem[] = idx >= 0
      ? items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...items, { ...item, quantity: 1 }];

    this._save({ restaurantId, items: newItems });
  }

  removeItem(restaurantId: number, itemId: number) {
    const current = this._cart();
    if (!current || current.restaurantId !== restaurantId) return;

    const item = current.items.find(i => i.id === itemId);
    if (!item) return;

    const newItems: CartItem[] =
      item.quantity > 1
        ? current.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)
        : current.items.filter(i => i.id !== itemId);

    if (newItems.length === 0) {
      this._save(null);
    } else {
      this._save({ restaurantId, items: newItems });
    }
  }

  clearCart() {
    this._save(null);
  }

  private _save(data: CartData | null) {
    this._cart.set(data);
    if (data) {
      try { localStorage.setItem(CART_KEY, JSON.stringify(data)); } catch {}
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }

  private _load(): CartData | null {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
