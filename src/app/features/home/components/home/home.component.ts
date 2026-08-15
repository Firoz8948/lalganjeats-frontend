import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { BannersComponent } from '../banners/banners.component';
import { FeaturedRestaurantsComponent } from '../featured-restaurants/featured-restaurants.component';
import { FooterComponent } from '../footer/footer.component';
import { InstagramCtaComponent } from '../instagram-cta/instagram-cta.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent,
    BannersComponent,
    FeaturedRestaurantsComponent,
    InstagramCtaComponent,
    FooterComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
