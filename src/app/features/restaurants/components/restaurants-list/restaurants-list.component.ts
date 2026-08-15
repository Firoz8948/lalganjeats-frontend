import { Component } from '@angular/core';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { FeaturedRestaurantsComponent } from '../../../home/components/featured-restaurants/featured-restaurants.component';

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, FeaturedRestaurantsComponent],
  template: `
    <app-navbar />
    <main class="page-content">
      <app-featured-restaurants />
    </main>
    <app-footer />
  `,
})
export class RestaurantsListComponent {}
