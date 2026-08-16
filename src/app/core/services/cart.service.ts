// frontend/src/app/core/services/cart.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface CartMenuItem {
  id:             number;
  variant_id:     number | null;
  variant_label:  string | null;
  name:           string;
  price:          number;
  original_price: number | null;
  is_veg:         boolean;
  category:       string;
  image_url:      string | null;
}

export interface CartItem extends CartMenuItem {
  quantity: number;
}

export interface CartData {
  restaurantId: number;
  restaurantName?: string;
  items:        CartItem[];
}

const CART_KEY = 'le_cart_v2';
const LEGACY_CART_KEY = 'le_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private _cart = signal<CartData | null>(this._load());

  totalItems = computed(() =>
    this._cart()?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  );

  totalAmount = computed(() =>
    this._cart()?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0
  );

  cart = computed(() => this._cart());

  itemsFor(restaurantId: number): CartItem[] {
    const c = this._cart();
    if (!c || c.restaurantId !== restaurantId) return [];
    return c.items;
  }

  getQuantity(restaurantId: number, itemId: number, variantId: number | null = null): number {
    return this.itemsFor(restaurantId).find(
      i => i.id === itemId && (i.variant_id ?? null) === (variantId ?? null)
    )?.quantity ?? 0;
  }

  private _lineKey(itemId: number, variantId: number | null): string {
    return `${itemId}:${variantId ?? 'none'}`;
  }

  addItem(
    restaurantId: number,
    item: CartMenuItem,
    restaurantName?: string,
  ): 'added' | 'conflict' {
    const current = this._cart();

    if (current && current.restaurantId !== restaurantId) {
      return 'conflict';
    }

    const existing = current?.restaurantId === restaurantId ? current : null;
    const items = existing ? existing.items : [];
    const key = this._lineKey(item.id, item.variant_id ?? null);
    const idx = items.findIndex(
      i => this._lineKey(i.id, i.variant_id ?? null) === key
    );
    const newItems: CartItem[] = idx >= 0
      ? items.map((i, n) => n === idx ? { ...i, quantity: i.quantity + 1 } : i)
      : [...items, { ...item, quantity: 1 }];

    this._save({
      restaurantId,
      restaurantName: restaurantName || existing?.restaurantName,
      items: newItems,
    });
    return 'added';
  }

  removeItem(restaurantId: number, itemId: number, variantId: number | null = null) {
    const current = this._cart();
    if (!current || current.restaurantId !== restaurantId) return;

    const key = this._lineKey(itemId, variantId);
    const item = current.items.find(
      i => this._lineKey(i.id, i.variant_id ?? null) === key
    );
    if (!item) return;

    const newItems: CartItem[] =
      item.quantity > 1
        ? current.items.map(i =>
            this._lineKey(i.id, i.variant_id ?? null) === key
              ? { ...i, quantity: i.quantity - 1 }
              : i
          )
        : current.items.filter(
            i => this._lineKey(i.id, i.variant_id ?? null) !== key
          );

    if (newItems.length === 0) {
      this._save(null);
    } else {
      this._save({
        restaurantId,
        restaurantName: current.restaurantName,
        items: newItems,
      });
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
    localStorage.removeItem(LEGACY_CART_KEY);
  }

  private _load(): CartData | null {
    try {
      const raw = localStorage.getItem(CART_KEY) || localStorage.getItem(LEGACY_CART_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CartData;
      if (!parsed?.items) return null;
      parsed.items = parsed.items.map(i => ({
        ...i,
        variant_id: (i as CartItem).variant_id ?? null,
        variant_label: (i as CartItem).variant_label ?? null,
        image_url: (i as CartItem).image_url ?? null,
      }));
      return parsed;
    } catch { return null; }
  }
}
