import { Injectable, inject, signal } from '@angular/core';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  DishSearchRestaurant,
  RestaurantService,
} from './restaurant.service';
import { CustomerLocationService } from './customer-location.service';

const MIN_CHARS = 2;

@Injectable({ providedIn: 'root' })
export class DishSearchService {
  private readonly restaurants = inject(RestaurantService);
  private readonly location = inject(CustomerLocationService);
  private readonly input$ = new Subject<string>();

  readonly query = signal('');
  readonly results = signal<DishSearchRestaurant[]>([]);
  readonly loading = signal(false);
  readonly hint = signal('');

  constructor() {
    this.input$
      .pipe(
        debounceTime(320),
        distinctUntilChanged(),
        tap((q) => {
          if (q.length < MIN_CHARS) {
            this.results.set([]);
            this.loading.set(false);
            this.hint.set(q.length ? 'Type at least 2 characters' : '');
          }
        }),
        switchMap((q) => {
          if (q.length < MIN_CHARS) {
            return of([] as DishSearchRestaurant[]);
          }
          const loc = this.location.location();
          if (loc?.lat == null || loc?.lng == null) {
            this.hint.set('Set your delivery location to search nearby restaurants');
            this.loading.set(false);
            return of([] as DishSearchRestaurant[]);
          }
          this.loading.set(true);
          this.hint.set('');
          return this.restaurants.searchByDish(q, loc.lat, loc.lng).pipe(
            catchError(() => {
              this.hint.set('Could not search right now. Try again.');
              return of([] as DishSearchRestaurant[]);
            }),
          );
        }),
      )
      .subscribe((rows) => {
        this.loading.set(false);
        this.results.set(rows);
        if (this.query().length >= MIN_CHARS && !rows.length && !this.hint()) {
          this.hint.set(`No restaurants serving “${this.query()}” near you`);
        }
      });
  }

  setQuery(value: string) {
    const q = (value || '').trimStart();
    this.query.set(q);
    this.input$.next(q);
  }

  clear() {
    this.query.set('');
    this.results.set([]);
    this.hint.set('');
    this.loading.set(false);
    this.input$.next('');
  }
}
