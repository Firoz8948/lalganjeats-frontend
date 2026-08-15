import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Restaurant } from '../../../../core/models/restaurant.model';
import { RestaurantService } from '../../../../core/services/restaurant.service';

@Component({
  selector: 'app-featured-restaurants',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './featured-restaurants.component.html',
  styleUrl: './featured-restaurants.component.scss',
})
export class FeaturedRestaurantsComponent implements OnInit {
  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private restaurantService: RestaurantService) {}

  ngOnInit() {
    this.restaurantService.getRestaurants().subscribe({
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
