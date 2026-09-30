import { Component, OnDestroy, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { BannersComponent } from '../banners/banners.component';
import { FeaturedRestaurantsComponent } from '../featured-restaurants/featured-restaurants.component';
import { FeaturedSubcategoriesComponent } from '../featured-subcategories/featured-subcategories.component';
import { FooterComponent } from '../footer/footer.component';
import { InstagramCtaComponent } from '../instagram-cta/instagram-cta.component';
import { ProductShelvesComponent } from '../product-shelves/product-shelves.component';
import { CartConflictDialogComponent } from '../../../../shared/cart-conflict-dialog/cart-conflict-dialog.component';
import { CartFloatBarComponent } from '../../../../shared/cart-float-bar/cart-float-bar.component';
import { ShopThemeService } from '../../../../core/services/shop-theme.service';
import {
  DEFAULT_HOME_CATEGORY,
  HOME_CATEGORIES,
  HomeCategoryKey,
  parseHomeCategory,
} from '../../home-categories';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavbarComponent,
    BannersComponent,
    FeaturedSubcategoriesComponent,
    FeaturedRestaurantsComponent,
    ProductShelvesComponent,
    CartConflictDialogComponent,
    CartFloatBarComponent,
    InstagramCtaComponent,
    FooterComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private theme = inject(ShopThemeService);

  readonly categories = HOME_CATEGORIES;
  readonly activeCategory = toSignal(
    this.route.queryParamMap.pipe(map((p) => parseHomeCategory(p.get('category')))),
    { initialValue: DEFAULT_HOME_CATEGORY },
  );

  constructor() {
    effect(() => this.theme.apply(this, this.activeCategory()));
  }

  ngOnDestroy() {
    this.theme.release(this);
  }

  selectCategory(key: HomeCategoryKey) {
    if (key === this.activeCategory()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category: key === DEFAULT_HOME_CATEGORY ? null : key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
