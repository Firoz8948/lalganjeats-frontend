import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { ProductCardComponent } from '../product-card/product-card.component';
import { CartConflictDialogComponent } from '../../../../shared/cart-conflict-dialog/cart-conflict-dialog.component';
import { CartFloatBarComponent } from '../../../../shared/cart-float-bar/cart-float-bar.component';
import {
  CatalogProduct,
  FeaturedSubcategory,
  RestaurantService,
} from '../../../../core/services/restaurant.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { ShopThemeService } from '../../../../core/services/shop-theme.service';
import { HOME_CATEGORIES, parseHomeCategory } from '../../home-categories';

/** Route segment and active id of the "All" entry (every product of the category). */
const ALL_SEGMENT = 'all';
const ALL_ID = 0;

type ProductsState =
  | { status: 'loading' }
  | { status: 'no-location' }
  | { status: 'error' }
  | { status: 'ready'; items: CatalogProduct[] };

@Component({
  selector: 'app-category-products',
  standalone: true,
  imports: [NavbarComponent, ProductCardComponent, CartConflictDialogComponent, CartFloatBarComponent],
  templateUrl: './category-products.component.html',
  styleUrl: './category-products.component.scss',
})
export class CategoryProductsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly restaurants = inject(RestaurantService);
  private readonly customerLocation = inject(CustomerLocationService);
  private readonly theme = inject(ShopThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  /** Direct opens (shared link, refresh) have no in-app page to go back to. */
  private readonly openedDirectly = !this.router.lastSuccessfulNavigation?.previousNavigation;
  private readonly productCache = new Map<string, CatalogProduct[]>();

  private readonly params = toSignal(this.route.paramMap.pipe(
    map((p) => ({
      key: parseHomeCategory(p.get('category')),
      subcategoryId: Number(p.get('subcategoryId')) || ALL_ID,
    })),
  ), { requireSync: true });

  readonly category = computed(() => HOME_CATEGORIES.find((c) => c.key === this.params().key)!);
  readonly activeId = computed(() => this.params().subcategoryId);
  readonly isAll = computed(() => this.activeId() === ALL_ID);
  readonly subcategories = signal<FeaturedSubcategory[]>([]);
  readonly subcategoriesLoading = signal(true);
  readonly products = signal<ProductsState>({ status: 'loading' });
  readonly activeName = computed(() => {
    if (this.isAll()) return `All ${this.category().label}`;
    return this.subcategories().find((s) => s.id === this.activeId())?.name ?? this.category().label;
  });

  constructor() {
    effect(() => this.theme.apply(this, this.params().key));

    effect(() => {
      const categoryId = this.category().categoryId;
      untracked(() => this.loadSubcategories(categoryId));
    });

    effect(() => {
      const id = this.activeId();
      const categoryId = this.category().categoryId;
      const loc = this.customerLocation.location();
      untracked(() => this.loadProducts(id, categoryId, loc?.lat ?? null, loc?.lng ?? null));
    });
  }

  ngOnDestroy() {
    this.theme.release(this);
  }

  select(item: FeaturedSubcategory) {
    if (item.id === this.activeId()) return;
    this.router.navigate(['/home/shop', this.params().key, item.id], { replaceUrl: true });
  }

  /** Food products open their restaurant; grocery stores have no customer page. */
  productLink(item: CatalogProduct): (string | number)[] | null {
    if (this.params().key === 'grocery') return null;
    return ['/restaurants', item.restaurant.slug || item.restaurant.id];
  }

  selectAll() {
    if (this.isAll()) return;
    this.router.navigate(['/home/shop', this.params().key, ALL_SEGMENT], { replaceUrl: true });
  }

  goBack() {
    if (this.openedDirectly) {
      this.router.navigate(['/home'], { queryParams: { category: this.params().key }, replaceUrl: true });
      return;
    }
    this.location.back();
  }

  retry() {
    const loc = this.customerLocation.location();
    const [id, categoryId] = [this.activeId(), this.category().categoryId];
    this.productCache.delete(this.cacheKey(id, categoryId, loc?.lat ?? null, loc?.lng ?? null));
    this.loadProducts(id, categoryId, loc?.lat ?? null, loc?.lng ?? null);
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private loadSubcategories(categoryId: number) {
    this.subcategoriesLoading.set(true);
    this.restaurants.getCategorySubcategories(categoryId).subscribe({
      next: (rows) => {
        this.subcategories.set(rows ?? []);
        this.subcategoriesLoading.set(false);
        this.scrollActiveIntoView();
      },
      error: () => {
        this.subcategories.set([]);
        this.subcategoriesLoading.set(false);
      },
    });
  }

  private loadProducts(subcategoryId: number, categoryId: number, lat: number | null, lng: number | null) {
    this.scrollActiveIntoView();
    if (lat == null || lng == null) {
      this.products.set({ status: 'no-location' });
      return;
    }
    const key = this.cacheKey(subcategoryId, categoryId, lat, lng);
    const cached = this.productCache.get(key);
    if (cached) {
      this.products.set({ status: 'ready', items: cached });
      return;
    }
    this.products.set({ status: 'loading' });
    const scope = subcategoryId === ALL_ID ? { categoryId } : { subcategoryId };
    const stillActive = () =>
      this.activeId() === subcategoryId && this.category().categoryId === categoryId;
    this.restaurants.getCatalogProducts(scope, lat, lng).subscribe({
      next: (items) => {
        this.productCache.set(key, items);
        if (stillActive()) this.products.set({ status: 'ready', items });
      },
      error: () => {
        if (stillActive()) this.products.set({ status: 'error' });
      },
    });
  }

  private cacheKey(id: number, categoryId: number, lat: number | null, lng: number | null) {
    return `${categoryId}:${id}:${lat}:${lng}`;
  }

  private scrollActiveIntoView() {
    afterNextRender(() => {
      const el = (this.host.nativeElement as HTMLElement).querySelector('.shop-cat.is-active');
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, { injector: this.injector });
  }
}
