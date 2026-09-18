import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  CatalogCategory,
  CatalogSubcategory,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-subcategories',
  standalone: true,
  imports: [FormsModule, PortalPageHeaderComponent],
  templateUrl: './admin-subcategories.component.html',
  styleUrl: './admin-subcategories.component.scss',
})
export class AdminSubcategoriesComponent implements OnInit {
  categories = signal<CatalogCategory[]>([]);
  subcategories = signal<CatalogSubcategory[]>([]);
  selectedCategoryId = signal(0);
  loading = signal(true);
  saving = signal(false);
  uploadingId = signal<number | null>(null);
  error = signal('');
  search = signal('');
  productSort = signal<'asc' | 'desc'>('desc');
  newName = '';

  filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const items = query
      ? this.subcategories().filter(item =>
          item.name.toLowerCase().includes(query)
        )
      : this.subcategories();
    const direction = this.productSort() === 'asc' ? 1 : -1;
    return [...items].sort(
      (a, b) =>
        (a.product_count - b.product_count) * direction ||
        a.name.localeCompare(b.name),
    );
  });

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getCatalogCategories().subscribe({
      next: categories => {
        this.categories.set(categories);
        const restaurant = categories.find(item => item.slug === 'restaurant');
        this.selectedCategoryId.set(restaurant?.id || categories[0]?.id || 0);
        this.loadSubcategories();
      },
      error: () => {
        this.error.set('Could not load categories.');
        this.loading.set(false);
      },
    });
  }

  selectCategory(value: number | string) {
    this.selectedCategoryId.set(Number(value));
    this.search.set('');
    this.loadSubcategories();
  }

  loadSubcategories() {
    if (!this.selectedCategoryId()) {
      this.subcategories.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.admin.getCatalogSubcategories(this.selectedCategoryId()).subscribe({
      next: value => {
        this.subcategories.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load subcategories.');
        this.loading.set(false);
      },
    });
  }

  add() {
    const name = this.newName.trim();
    if (!name || !this.selectedCategoryId()) return;
    this.saving.set(true);
    this.error.set('');
    this.admin.createCatalogSubcategory(
      this.selectedCategoryId(),
      name,
    ).subscribe({
      next: item => {
        this.subcategories.update(value => [...value, item]);
        this.newName = '';
        this.saving.set(false);
      },
      error: error => {
        this.error.set(error.error?.detail || 'Could not add subcategory.');
        this.saving.set(false);
      },
    });
  }

  private mergeSubcategory(updated: CatalogSubcategory) {
    this.subcategories.update(value =>
      value.map(subcategory =>
        subcategory.id === updated.id
          ? {
              ...subcategory,
              ...updated,
              // Never let a mutation response wipe a known count.
              product_count:
                updated.product_count ?? subcategory.product_count ?? 0,
            }
          : subcategory
      )
    );
  }

  toggleFeatured(item: CatalogSubcategory) {
    this.admin.toggleCatalogSubcategoryFeatured(item.id).subscribe({
      next: updated => this.mergeSubcategory(updated),
      error: () => this.error.set('Could not update featured state.'),
    });
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  onImagePicked(item: CatalogSubcategory, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('Choose an image file.');
      return;
    }
    this.uploadingId.set(item.id);
    this.error.set('');
    this.admin.uploadBanner(file, 'subcategory').subscribe({
      next: uploaded => {
        this.admin.updateCatalogSubcategoryImage(item.id, uploaded.url).subscribe({
          next: updated => {
            this.mergeSubcategory(updated);
            this.uploadingId.set(null);
          },
          error: () => {
            this.error.set('Uploaded, but could not save image on subcategory.');
            this.uploadingId.set(null);
          },
        });
      },
      error: () => {
        this.error.set('Could not upload image.');
        this.uploadingId.set(null);
      },
    });
  }

  clearImage(item: CatalogSubcategory) {
    this.uploadingId.set(item.id);
    this.admin.updateCatalogSubcategoryImage(item.id, null).subscribe({
      next: updated => {
        this.mergeSubcategory(updated);
        this.uploadingId.set(null);
      },
      error: () => {
        this.error.set('Could not remove image.');
        this.uploadingId.set(null);
      },
    });
  }
}