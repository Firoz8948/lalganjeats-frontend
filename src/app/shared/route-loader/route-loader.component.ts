import { Component, OnDestroy, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * Navigation progress indicator.
 *
 * Lazy route chunks can take a moment to download, during which a tap looks
 * like it did nothing. The bar is delayed so instant navigations never flash,
 * and held briefly once shown so it never blinks in and out.
 */
const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 320;

@Component({
  selector: 'app-route-loader',
  standalone: true,
  templateUrl: './route-loader.component.html',
  styleUrl: './route-loader.component.scss',
})
export class RouteLoaderComponent implements OnDestroy {
  private router = inject(Router);
  private sub: Subscription;
  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private shownAt = 0;

  loading = signal(false);

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.start();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.stop();
      }
    });
  }

  private start() {
    clearTimeout(this.hideTimer);
    if (this.loading() || this.showTimer) return;
    this.showTimer = setTimeout(() => {
      this.showTimer = undefined;
      this.shownAt = Date.now();
      this.loading.set(true);
    }, SHOW_DELAY_MS);
  }

  private stop() {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
    if (!this.loading()) return;

    const remaining = MIN_VISIBLE_MS - (Date.now() - this.shownAt);
    if (remaining <= 0) {
      this.loading.set(false);
      return;
    }
    this.hideTimer = setTimeout(() => this.loading.set(false), remaining);
  }

  ngOnDestroy() {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.sub.unsubscribe();
  }
}
