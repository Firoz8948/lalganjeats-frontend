import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

interface SeoPage {
  title: string;
  description: string;
  index: boolean;
}

const SITE_URL = 'https://lalganjeats.com';
const OG_IMAGE = 'https://lalganjeats-cdn.b-cdn.net/media/og-image.webp';
const DEFAULT_PAGE: SeoPage = {
  title: 'Best Food Delivery App in Lalganj Ajhara | LalganjEats',
  description:
    'Order food online from local restaurants in Lalganj Ajhara. LalganjEats is Lalganj ka pahla delivery app, with groceries and more coming soon.',
  index: true,
};

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  start(): void {
    this.applyForUrl(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.applyForUrl(event.urlAfterRedirects));
  }

  setPage(page: Partial<SeoPage> & Pick<SeoPage, 'title' | 'description'>): void {
    this.apply(
      { ...DEFAULT_PAGE, ...page },
      this.router.url.split('?')[0].split('#')[0],
    );
  }

  private applyForUrl(rawUrl: string): void {
    const path = rawUrl.split('?')[0].split('#')[0];
    if (path === '/' || path === '/home') {
      this.apply(DEFAULT_PAGE, '/home');
      return;
    }
    if (path === '/restaurants') {
      this.apply(
        {
          title: 'Restaurants in Lalganj Ajhara | Order Food Online',
          description:
            'Browse restaurants delivering in Lalganj Ajhara. Explore local meals, snacks, sweets, tea and more on LalganjEats.',
          index: true,
        },
        path,
      );
      return;
    }
    if (/^\/restaurants\/\d+$/.test(path)) {
      this.apply(
        {
          title: 'Restaurant Menu & Online Food Delivery | LalganjEats',
          description:
            'View the restaurant menu, choose item sizes and order food for delivery in Lalganj Ajhara with LalganjEats.',
          index: true,
        },
        path,
      );
      return;
    }

    // Account, checkout and operations pages should never appear in search.
    this.apply(
      {
        title: 'LalganjEats',
        description: DEFAULT_PAGE.description,
        index: false,
      },
      path,
    );
  }

  private apply(page: SeoPage, path: string): void {
    const canonicalUrl = `${SITE_URL}${path === '/' ? '/home' : path}`;
    const robots = page.index
      ? 'index, follow, max-image-preview:large'
      : 'noindex, nofollow';

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'LalganjEats' });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/webp' });
    this.meta.updateTag({
      property: 'og:image:alt',
      content: 'LalganjEats — Good Food. Fast Delivery. in Lalganj Ajhara',
    });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: OG_IMAGE });

    let canonical = this.document.head.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }
}
