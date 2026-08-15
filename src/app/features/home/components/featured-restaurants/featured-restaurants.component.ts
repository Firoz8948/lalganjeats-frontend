import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';

@Component({
  selector: 'app-featured-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './featured-restaurants.component.html',
  styleUrl: './featured-restaurants.component.scss',
})
export class FeaturedRestaurantsComponent implements OnInit {
  private restaurantService = inject(RestaurantService);
  private customerLocation = inject(CustomerLocationService);

  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);
  error = signal('');
  needsLocation = signal(false);

  constructor() {
    effect(() => {
      const loc = this.customerLocation.location();
      this.loadRestaurants(loc?.lat ?? null, loc?.lng ?? null);
    });
  }

  ngOnInit() {
    // Initial load handled by effect; keep hook for Angular lifecycle.
  }

  private loadRestaurants(lat: number | null, lng: number | null) {
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
    this.restaurantService.getRestaurants(lat, lng).subscribe({
      next: (data) => {
        this.restaurants.set(data);
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
