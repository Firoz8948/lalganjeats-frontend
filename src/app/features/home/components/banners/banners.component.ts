import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService, HomeBannerSlide } from '../../../../core/services/banner.service';

const DEFAULT_SLIDES: HomeBannerSlide[] = [];
const MOBILE_BREAKPOINT = 768;

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
  loading = signal(true);

  private settledImages = signal<ReadonlySet<string>>(new Set<string>());
  private isMobile = signal(
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );
  private autoPlayInterval: ReturnType<typeof setInterval> | undefined;

  readonly desktopSize = '2140 × 735 px';
  readonly mobileSize = '828 × 350 px';

  /** Only the variant actually rendered at this width gates the loader. */
  private activeImageUrl = computed(() => {
    const slide = this.slides()[this.currentIndex()];
    if (!slide) return null;
    return this.isMobile()
      ? slide.mobile_image_url || slide.desktop_image_url
      : slide.desktop_image_url || slide.mobile_image_url;
  });

  imageLoading = computed(() => {
    const url = this.activeImageUrl();
    if (!url) return false;
    return !this.settledImages().has(url);
  });

  constructor(private bannerService: BannerService) {}

  ngOnInit() {
    this.loadBanners();
    this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth <= MOBILE_BREAKPOINT);
  }

  loadBanners() {
    this.bannerService.getHomeBanners().subscribe({
      next: (data) => {
        this.slides.set(data?.length ? data : []);
        this.currentIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
        this.slides.set([]);
        this.loading.set(false);
      },
    });
  }

  /** A broken image must clear the loader too, otherwise it spins forever. */
  onImageSettled(url: string | null | undefined) {
    if (!url) return;
    this.settledImages.update((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
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
