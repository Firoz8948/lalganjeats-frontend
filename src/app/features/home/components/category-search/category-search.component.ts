import {
  Component,
  ElementRef,
  Injector,
  Input,
  OnDestroy,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
} from 'rxjs';
import {
  ProductSearchResult,
  RestaurantService,
} from '../../../../core/services/restaurant.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { BackHandlerService } from '../../../../core/services/back-handler.service';
import { HOME_CATEGORIES } from '../../home-categories';

const GROCERY_CATEGORY_ID = HOME_CATEGORIES.find((c) => c.key === 'grocery')!.categoryId;
const MIN_CHARS = 2;
const SUGGESTION_LIMIT = 8;
const RESULT_LIMIT = 50;

@Component({
  selector: 'app-category-search',
  standalone: true,
  imports: [RouterModule, NgTemplateOutlet],
  templateUrl: './category-search.component.html',
  styleUrl: './category-search.component.scss',
  host: { '[class.mobile-only]': 'mobileOnly' },
})
export class CategorySearchComponent implements OnDestroy {
  @Input({ required: true }) categoryId!: number;
  @Input() label = 'Grocery';
  @Input() placeholder = 'Search products';
  @Input() fallbackEmoji = '🛒';
  /** Hides the bar on desktop, where the navbar already has a search. */
  @Input() mobileOnly = false;

  @ViewChild('pageInput') private pageInput?: ElementRef<HTMLInputElement>;

  private readonly restaurants = inject(RestaurantService);
  private readonly location = inject(CustomerLocationService);
  private readonly backHandler = inject(BackHandlerService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly input$ = new Subject<string>();
  private readonly closeHandler = () => this.close();

  readonly open = signal(false);
  readonly query = signal('');
  readonly suggestions = signal<ProductSearchResult[]>([]);
  readonly suggesting = signal(false);
  readonly results = signal<ProductSearchResult[] | null>(null);
  readonly searchedQuery = signal('');
  readonly searching = signal(false);
  readonly hint = signal('');

  /** Results stay on screen until the customer edits the query again. */
  readonly showResults = computed(
    () => this.results() !== null && this.query().trim() === this.searchedQuery(),
  );
  readonly canSuggest = computed(() => this.query().trim().length >= MIN_CHARS);

  private readonly subscription = this.input$
    .pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => {
        const coords = this.coords();
        if (q.length < MIN_CHARS || !coords) return of([] as ProductSearchResult[]);
        return this.restaurants
          .searchProducts(q, this.categoryId, coords.lat, coords.lng, SUGGESTION_LIMIT)
          .pipe(catchError(() => of([] as ProductSearchResult[])));
      }),
    )
    .subscribe((rows) => {
      this.suggestions.set(rows);
      this.suggesting.set(false);
    });

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.open()) this.close();
  }

  onBarInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    input.value = '';
    input.blur();
    this.openPage(value);
  }

  openPage(initial = '') {
    if (!this.open()) {
      this.open.set(true);
      this.backHandler.push(this.closeHandler);
      this.document.body.style.overflow = 'hidden';
    }
    this.onQueryInput(initial);
    afterNextRender(
      () => {
        const el = this.pageInput?.nativeElement;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      },
      { injector: this.injector },
    );
  }

  onQueryInput(value: string) {
    const q = (value || '').trimStart();
    this.query.set(q);
    this.hint.set(this.coords() || !q ? '' : 'Set your delivery location to search nearby stores');
    this.suggesting.set(q.trim().length >= MIN_CHARS && !!this.coords());
    if (q.trim().length < MIN_CHARS) this.suggestions.set([]);
    this.input$.next(q.trim());
  }

  clearQuery() {
    this.onQueryInput('');
    this.pageInput?.nativeElement.focus();
  }

  search() {
    const q = this.query().trim();
    if (q.length < MIN_CHARS) {
      this.hint.set(`Type at least ${MIN_CHARS} characters`);
      return;
    }
    const coords = this.coords();
    if (!coords) {
      this.hint.set('Set your delivery location to search nearby stores');
      return;
    }
    this.hint.set('');
    this.pageInput?.nativeElement.blur();
    this.searchedQuery.set(q);
    this.searching.set(true);
    this.results.set([]);
    this.restaurants
      .searchProducts(q, this.categoryId, coords.lat, coords.lng, RESULT_LIMIT)
      .pipe(catchError(() => {
        this.hint.set('Could not search right now. Try again.');
        return of([] as ProductSearchResult[]);
      }))
      .subscribe((rows) => {
        if (this.searchedQuery() !== q) return;
        this.results.set(rows);
        this.searching.set(false);
      });
  }

  pickSuggestion(item: ProductSearchResult) {
    this.query.set(item.name);
    this.search();
  }

  close() {
    if (!this.open()) return;
    this.open.set(false);
    this.backHandler.remove(this.closeHandler);
    this.document.body.style.overflow = '';
    this.query.set('');
    this.suggestions.set([]);
    this.suggesting.set(false);
    this.results.set(null);
    this.searchedQuery.set('');
    this.searching.set(false);
    this.hint.set('');
    this.input$.next('');
  }

  /** Grocery products open their subcategory; grocery stores have no customer page. */
  storeLink(item: ProductSearchResult) {
    if (this.categoryId === GROCERY_CATEGORY_ID) {
      return ['/home/shop', 'grocery', item.subcategory_id ?? 'all'];
    }
    return ['/restaurants', item.restaurant.slug || item.restaurant.id];
  }

  private coords(): { lat: number; lng: number } | null {
    const loc = this.location.location();
    return loc?.lat != null && loc?.lng != null ? { lat: loc.lat, lng: loc.lng } : null;
  }
}
