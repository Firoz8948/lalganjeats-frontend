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
  imports: [FormsModule],
  templateUrl: './admin-subcategories.component.html',
  styleUrl: './admin-subcategories.component.scss',
})
export class AdminSubcategoriesComponent implements OnInit {
  categories = signal<CatalogCategory[]>([]);
  subcategories = signal<CatalogSubcategory[]>([]);
  selectedCategoryId = signal(0);
  loading = signal(true);
  saving = signal(false);
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

  toggleFeatured(item: CatalogSubcategory) {
    this.admin.toggleCatalogSubcategoryFeatured(item.id).subscribe(updated => {
      this.subcategories.update(value =>
        value.map(subcategory =>
          subcategory.id === updated.id
            ? { ...subcategory, ...updated }
            : subcategory
        )
      );
    });
  }
}
