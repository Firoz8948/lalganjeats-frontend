import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FeaturedSubcategory,
  RestaurantService,
} from '../../../../core/services/restaurant.service';

@Component({
  selector: 'app-featured-subcategories',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './featured-subcategories.component.html',
  styleUrl: './featured-subcategories.component.scss',
})
export class FeaturedSubcategoriesComponent {
  private restaurants = inject(RestaurantService);

  @ViewChild('scroller') scroller?: ElementRef<HTMLElement>;
  items = signal<FeaturedSubcategory[]>([]);

  constructor() {
    this.restaurants.getFeaturedSubcategories().subscribe({
      next: items => this.items.set(items),
    });
  }

  scroll(direction: -1 | 1) {
    this.scroller?.nativeElement.scrollBy({
      left: direction * Math.min(520, window.innerWidth * 0.7),
      behavior: 'smooth',
    });
  }
}
