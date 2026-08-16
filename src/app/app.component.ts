import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteLoaderComponent } from './shared/route-loader/route-loader.component';
import { SeoService } from './core/services/seo.service';
import { SmoothScrollService } from './core/services/smooth-scroll.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouteLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'LalganjEats';

  constructor(seo: SeoService, smoothScroll: SmoothScrollService) {
    seo.start();
    smoothScroll.start();
  }
}
