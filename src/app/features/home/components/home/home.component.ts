import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { BannersComponent } from '../banners/banners.component';
import { FeaturedRestaurantsComponent } from '../featured-restaurants/featured-restaurants.component';
import { FeaturedSubcategoriesComponent } from '../featured-subcategories/featured-subcategories.component';
import { FooterComponent } from '../footer/footer.component';
import { InstagramCtaComponent } from '../instagram-cta/instagram-cta.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavbarComponent,
    BannersComponent,
    FeaturedSubcategoriesComponent,
    FeaturedRestaurantsComponent,
    InstagramCtaComponent,
    FooterComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
