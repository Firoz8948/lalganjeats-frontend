import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, CatalogCategory, MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '../../../../core/services/admin.service';
import { HomeBannerSlide } from '../../../../core/services/banner.service';

type BannerVariant = 'desktop' | 'mobile';
type BannerPreview = {
  slideId: number; slideNumber: number; variant: BannerVariant; file: File;
  objectUrl: string; naturalW: number; naturalH: number;
  crop: { left: number; top: number; width: number; height: number };
};

@Component({
  selector: 'app-admin-banners',
  standalone: true,
  imports: [PortalPageHeaderComponent, FormsModule],
  templateUrl: './admin-banners.component.html',
  styleUrl: './admin-banners.component.scss',
})
export class AdminBannersComponent implements OnInit, OnDestroy {
  categories = signal<CatalogCategory[]>([]);
  selectedCategoryId = signal(0);
  selectedCategoryName = computed(() => this.categories().find(c => c.id === this.selectedCategoryId())?.name ?? '');
  homeSlides = signal<HomeBannerSlide[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');
  uploading = signal<string | null>(null);
  preview = signal<BannerPreview | null>(null);
  readonly variants: BannerVariant[] = ['desktop', 'mobile'];
  readonly maxImageMb = MAX_IMAGE_UPLOAD_MB;
  readonly desktopSpec = { label: 'Desktop Banner', hint: 'Shown on the home page carousel (desktop & tablet landscape)', size: '2140 × 735 px', aspect: 2140 / 735 };
  readonly mobileSpec = { label: 'Mobile Banner', hint: 'Shown on the home page carousel (mobile & small screens)', size: '828 × 350 px (live frame ~ phone width × 175px)', aspect: 358 / 175 };

  constructor(private admin: AdminService) {}
  ngOnInit() { this.loadCategories(); }
  ngOnDestroy() { this.closePreview(); }

  loadCategories() {
    this.loading.set(true); this.error.set('');
    this.admin.getCatalogCategories().subscribe({
      next: categories => {
        const active = categories.filter(c => c.is_active);
        this.categories.set(active);
        const restaurant = active.find(c => c.slug === 'restaurant');
        this.selectedCategoryId.set(restaurant?.id || active[0]?.id || 0);
        this.load();
      },
      error: () => { this.error.set('Could not load categories.'); this.loading.set(false); },
    });
  }
  selectCategory(value: number | string) {
    this.selectedCategoryId.set(Number(value));
    this.closePreview(); this.success.set('');
    this.load();
  }
  load() {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) { this.homeSlides.set([]); this.loading.set(false); return; }
    this.loading.set(true); this.error.set('');
    this.admin.getHomeBanners(categoryId).subscribe({
      next: slides => {
        if (categoryId !== this.selectedCategoryId()) return;
        this.homeSlides.set(slides); this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load home banners.'); this.loading.set(false); },
    });
  }
  addSlide() {
    const categoryId = this.selectedCategoryId();
    if (!categoryId) return;
    this.error.set(''); this.success.set(''); this.saving.set(true);
    this.admin.createHomeBanner(categoryId).subscribe({
      next: slide => {
        this.saving.set(false);
        if (categoryId !== this.selectedCategoryId()) return;
        this.homeSlides.update(v => [...v, slide]);
        this.success.set(`${this.selectedCategoryName()} slide ${slide.slide_number} added.`);
      },
      error: e => { this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to add slide.'); this.saving.set(false); },
    });
  }
  toggle(slide: HomeBannerSlide) {
    if (!slide.id) return;
    const active = !(slide.is_active !== false);
    this.admin.patchHomeBanner(slide.id, { is_active: active }).subscribe({
      next: updated => { this.replace(updated); this.success.set(active ? `Slide ${updated.slide_number} is now active.` : `Slide ${updated.slide_number} is now inactive.`); },
      error: e => this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to update status.'),
    });
  }
  remove(slide: HomeBannerSlide) {
    if (!slide.id || !confirm(`Delete ${this.selectedCategoryName()} slide ${slide.slide_number}? This cannot be undone.`)) return;
    this.admin.deleteHomeBanner(slide.id).subscribe({
      next: res => {
        if (slide.business_category_id === this.selectedCategoryId()) this.homeSlides.set(res.slides);
        this.success.set('Slide deleted.');
      },
      error: e => this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to delete slide.'),
    });
  }
  isUploading(id: number, variant: BannerVariant) { return this.uploading() === `${id}-${variant}`; }
  select(event: Event, slide: HomeBannerSlide, variant: BannerVariant) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
    if (!file || !slide.id) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { this.error.set('Only JPG, PNG, or WebP images are allowed.'); return; }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) { this.error.set(`Image must be ${MAX_IMAGE_UPLOAD_MB} MB or smaller.`); return; }
    const objectUrl = URL.createObjectURL(file); const image = new Image();
    image.onload = () => {
      this.closePreview();
      this.preview.set({ slideId: slide.id!, slideNumber: slide.slide_number, variant, file, objectUrl, naturalW: image.naturalWidth, naturalH: image.naturalHeight, crop: this.coverCrop(image.naturalWidth, image.naturalHeight, variant === 'desktop' ? this.desktopSpec.aspect : this.mobileSpec.aspect) });
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); this.error.set('Could not read that image.'); };
    image.src = objectUrl;
  }
  coverCrop(w: number, h: number, aspect: number) {
    if (w / h >= aspect) { const visible = h * aspect; return { left: ((w - visible) / 2 / w) * 100, top: 0, width: (visible / w) * 100, height: 100 }; }
    const visible = w / aspect; return { left: 0, top: ((h - visible) / 2 / h) * 100, width: 100, height: (visible / h) * 100 };
  }
  closePreview() { const value = this.preview(); if (value) URL.revokeObjectURL(value.objectUrl); this.preview.set(null); }
  confirmUpload() {
    const value = this.preview(); if (!value) return;
    this.uploading.set(`${value.slideId}-${value.variant}`);
    this.admin.uploadBanner(value.file, value.variant === 'desktop' ? 'home_banner_desktop' : 'home_banner_mobile').subscribe({
      next: response => this.admin.patchHomeBanner(value.slideId, value.variant === 'desktop' ? { desktop_image_url: response.url } : { mobile_image_url: response.url }).subscribe({
        next: updated => { this.replace(updated); this.uploading.set(null); this.success.set(`Slide ${updated.slide_number} ${value.variant} image updated.`); this.closePreview(); },
        error: e => { this.uploading.set(null); this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to save image.'); },
      }),
      error: e => { this.uploading.set(null); this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to upload image.'); },
    });
  }
  clear(slide: HomeBannerSlide, variant: BannerVariant) {
    if (!slide.id) return;
    this.admin.patchHomeBanner(slide.id, variant === 'desktop' ? { desktop_image_url: null } : { mobile_image_url: null }).subscribe({
      next: updated => { this.replace(updated); this.success.set(`Slide ${updated.slide_number} ${variant} image removed.`); },
      error: e => this.error.set(typeof e.error?.detail === 'string' ? e.error.detail : 'Failed to remove image.'),
    });
  }
  private replace(updated: HomeBannerSlide) { this.homeSlides.update(v => v.map(s => s.id === updated.id ? updated : s)); }
}
