import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService, HomeBannerSlide } from '../../../../core/services/banner.service';

const DEFAULT_SLIDES: HomeBannerSlide[] = [];

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.scss',
})
export class BannersComponent implements OnInit, OnDestroy {
  currentIndex = signal(0);
  slides = signal<HomeBannerSlide[]>(DEFAULT_SLIDES);
  private autoPlayInterval: ReturnType<typeof setInterval> | undefined;

  readonly desktopSize = '2140 × 735 px';
  readonly mobileSize = '828 × 350 px';

  constructor(private bannerService: BannerService) {}

  ngOnInit() {
    this.loadBanners();
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  loadBanners() {
    this.bannerService.getHomeBanners().subscribe({
      next: (data) => {
        this.slides.set(data?.length ? data : []);
        this.currentIndex.set(0);
      },
    });
  }

  startAutoPlay() {
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      this.next();
    }, 4000);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = undefined;
    }
  }

  next() {
    const n = this.slides().length;
    if (n < 2) return;
    this.currentIndex.update(i => (i + 1) % n);
  }

  prev() {
    const n = this.slides().length;
    if (n < 2) return;
    this.currentIndex.update(i => (i - 1 + n) % n);
  }

  goTo(index: number) {
    this.currentIndex.set(index);
    this.stopAutoPlay();
    this.startAutoPlay();
  }
}
