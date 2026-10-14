// frontend/src/app/core/services/cart.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import type { HomeCategoryKey } from '../../features/home/home-categories';
import { OrderService } from './order.service';

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

export interface CartStore {
  restaurantId: number;
  restaurantName?: string;
  /** Home tab of the store; missing on carts saved before it was tracked. */
  storeCategory?: HomeCategoryKey;
  items:        CartItem[];
}

/** One store normally; several only when every store is a grocery store. */
export interface CartData {
  stores: CartStore[];
}

const CART_KEY = 'le_cart_v3';
const SINGLE_STORE_CART_KEY = 'le_cart_v2';
const LEGACY_CART_KEY = 'le_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly orders = inject(OrderService);
  private _stores = signal<CartStore[]>(this._load());
  private readonly multiStoreEnabled = signal(false);
  private readonly maxStores = signal(1);

  constructor() {
    this.orders.multiStoreConfig().subscribe({
      next: cfg => {
        this.multiStoreEnabled.set(!!cfg.enabled);
        this.maxStores.set(cfg.enabled ? Math.max(1, Number(cfg.max_stores) || 1) : 1);
      },
      error: () => {},
    });
  }

  stores = this._stores.asReadonly();
  cart = computed<CartData | null>(() =>
    this._stores().length ? { stores: this._stores() } : null
  );
  isMultiStore = computed(() => this._stores().length > 1);
  isGroceryCart = computed(() =>
    this._stores().length > 0 && this._stores().every(s => s.storeCategory === 'grocery')
  );
  storeNames = computed(() =>
    this._stores().map(s => s.restaurantName || 'Store').join(' + ')
  );

  totalItems = computed(() =>
    this._stores().reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0), 0)
  );

  totalAmount = computed(() =>
    this._stores().reduce((sum, s) => sum + this.storeTotal(s), 0)
  );

  storeTotal(store: CartStore): number {
    return store.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  itemsFor(restaurantId: number): CartItem[] {
    return this._stores().find(s => s.restaurantId === restaurantId)?.items ?? [];
  }

  getQuantity(restaurantId: number, itemId: number, variantId: number | null = null): number {
    return this.itemsFor(restaurantId).find(
      i => i.id === itemId && (i.variant_id ?? null) === (variantId ?? null)
    )?.quantity ?? 0;
  }

  private _lineKey(itemId: number, variantId: number | null): string {
    return `${itemId}:${variantId ?? 'none'}`;
  }

  /** Another grocery store may join a grocery cart (server switch + store limit). */
  private _canJoin(storeCategory?: HomeCategoryKey): boolean {
    return (
      this.multiStoreEnabled() &&
      storeCategory === 'grocery' &&
      this.isGroceryCart() &&
      this._stores().length < this.maxStores()
    );
  }

  addItem(
    restaurantId: number,
    item: CartMenuItem,
    restaurantName?: string,
    storeCategory?: HomeCategoryKey,
  ): 'added' | 'conflict' {
    const stores = this._stores();
    const existing = stores.find(s => s.restaurantId === restaurantId);

    if (!existing && stores.length > 0 && !this._canJoin(storeCategory)) {
      return 'conflict';
    }

    const items = existing ? existing.items : [];
    const key = this._lineKey(item.id, item.variant_id ?? null);
    const idx = items.findIndex(
      i => this._lineKey(i.id, i.variant_id ?? null) === key
    );
    const newItems: CartItem[] = idx >= 0
      ? items.map((i, n) => n === idx ? { ...i, quantity: i.quantity + 1 } : i)
      : [...items, { ...item, quantity: 1 }];

    const store: CartStore = {
      restaurantId,
      restaurantName: restaurantName || existing?.restaurantName,
      storeCategory: storeCategory ?? existing?.storeCategory,
      items: newItems,
    };
    this._save(
      existing
        ? stores.map(s => (s.restaurantId === restaurantId ? store : s))
        : [...stores, store]
    );
    return 'added';
  }

  removeItem(restaurantId: number, itemId: number, variantId: number | null = null) {
    const key = this._lineKey(itemId, variantId);
    this._updateStore(restaurantId, items => {
      const item = items.find(i => this._lineKey(i.id, i.variant_id ?? null) === key);
      if (!item) return items;
      return item.quantity > 1
        ? items.map(i =>
            this._lineKey(i.id, i.variant_id ?? null) === key
              ? { ...i, quantity: i.quantity - 1 }
              : i
          )
        : items.filter(i => this._lineKey(i.id, i.variant_id ?? null) !== key);
    });
  }

  deleteItem(restaurantId: number, itemId: number, variantId: number | null = null) {
    const key = this._lineKey(itemId, variantId);
    this._updateStore(restaurantId, items =>
      items.filter(i => this._lineKey(i.id, i.variant_id ?? null) !== key)
    );
  }

  clearCart() {
    this._save([]);
  }

  private _updateStore(restaurantId: number, change: (items: CartItem[]) => CartItem[]) {
    const stores = this._stores();
    if (!stores.some(s => s.restaurantId === restaurantId)) return;
    this._save(
      stores
        .map(s => (s.restaurantId === restaurantId ? { ...s, items: change(s.items) } : s))
        .filter(s => s.items.length > 0)
    );
  }

  private _save(stores: CartStore[]) {
    this._stores.set(stores);
    if (stores.length) {
      try { localStorage.setItem(CART_KEY, JSON.stringify({ stores })); } catch {}
    } else {
      localStorage.removeItem(CART_KEY);
    }
    localStorage.removeItem(SINGLE_STORE_CART_KEY);
    localStorage.removeItem(LEGACY_CART_KEY);
  }

  private _normalizeItems(items: CartItem[]): CartItem[] {
    return items.map(i => ({
      ...i,
      variant_id: i.variant_id ?? null,
      variant_label: i.variant_label ?? null,
      image_url: i.image_url ?? null,
    }));
  }

  private _load(): CartStore[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartData;
        return (parsed?.stores ?? [])
          .filter(s => s?.items?.length)
          .map(s => ({ ...s, items: this._normalizeItems(s.items) }));
      }
      // Carts saved before multi-store support held a single store.
      const old = localStorage.getItem(SINGLE_STORE_CART_KEY) || localStorage.getItem(LEGACY_CART_KEY);
      if (!old) return [];
      const single = JSON.parse(old) as CartStore;
      if (!single?.items?.length) return [];
      return [{ ...single, items: this._normalizeItems(single.items) }];
    } catch { return []; }
  }
}
