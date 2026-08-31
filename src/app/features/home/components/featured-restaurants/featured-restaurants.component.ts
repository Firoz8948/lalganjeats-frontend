import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';

type CardMetaKind = 'min' | 'time' | 'distance';

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

function formatDistanceKm(km: number): string {
  if (km < 0.1) return '0.1 km';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

@Component({
  selector: 'app-featured-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './featured-restaurants.component.html',
  styleUrl: './featured-restaurants.component.scss',
})
export class FeaturedRestaurantsComponent implements OnInit, OnDestroy {
  private restaurantService = inject(RestaurantService);
  private customerLocation = inject(CustomerLocationService);
  private route = inject(ActivatedRoute);
  private metaTimer: ReturnType<typeof setInterval> | null = null;

  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);
  error = signal('');
  needsLocation = signal(false);
  /** Shared ticker so each card cycles min price → delivery time → distance. */
  metaTick = signal(0);
  selectedSubcategoryId = signal<number | null>(null);
  selectedSubcategoryName = signal('');

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const id = Number(params.get('subcategory_id'));
      this.selectedSubcategoryId.set(Number.isInteger(id) && id > 0 ? id : null);
      this.selectedSubcategoryName.set(params.get('name')?.trim() || '');
    });
    effect(() => {
      const loc = this.customerLocation.location();
      this.loadRestaurants(
        loc?.lat ?? null,
        loc?.lng ?? null,
        this.selectedSubcategoryId(),
      );
    });
  }

  ngOnInit() {
    this.metaTimer = setInterval(() => {
      this.metaTick.update((n) => n + 1);
    }, 2800);
  }

  ngOnDestroy() {
    if (this.metaTimer) clearInterval(this.metaTimer);
  }

  cardMeta(restaurant: Restaurant): { kind: CardMetaKind; label: string } {
    const kinds: CardMetaKind[] = ['min', 'time', 'distance'];
    const kind = kinds[this.metaTick() % 3];
    if (kind === 'min') {
      return { kind, label: `Min. ${restaurant.min_order || '—'}` };
    }
    if (kind === 'time') {
      return { kind, label: restaurant.delivery_time || '—' };
    }
    return { kind, label: this.distanceLabel(restaurant) };
  }

  private distanceLabel(restaurant: Restaurant): string {
    const loc = this.customerLocation.location();
    const rLat = restaurant.latitude;
    const rLng = restaurant.longitude;
    if (
      loc == null ||
      rLat == null ||
      rLng == null ||
      Number.isNaN(Number(rLat)) ||
      Number.isNaN(Number(rLng))
    ) {
      return '—';
    }
    return formatDistanceKm(haversineKm(loc.lat, loc.lng, Number(rLat), Number(rLng)));
  }

  private loadRestaurants(
    lat: number | null,
    lng: number | null,
    subcategoryId: number | null,
  ) {
    if (lat == null || lng == null) {
      this.needsLocation.set(true);
      this.restaurants.set([]);
      this.loading.set(false);
      this.error.set('');
      return;
    }

    this.needsLocation.set(false);
    this.loading.set(true);
    this.error.set('');
    this.restaurantService.getRestaurants(lat, lng, subcategoryId).subscribe({
      next: (data) => {
        const sorted = [...(data || [])].sort(
          (a, b) => (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0),
        );
        this.restaurants.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load restaurants. Is the backend running?');
        this.loading.set(false);
      },
    });
  }

  getStarArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  getStarType(rating: number, index: number): 'full' | 'half' | 'empty' {
    if (index < Math.floor(rating)) return 'full';
    if (index < rating) return 'half';
    return 'empty';
  }
}
