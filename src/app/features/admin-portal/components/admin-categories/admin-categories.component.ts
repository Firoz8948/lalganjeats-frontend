import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  CatalogCategory,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule, PortalPageHeaderComponent],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.scss',
})
export class AdminCategoriesComponent implements OnInit {
  categories = signal<CatalogCategory[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  newName = '';

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.admin.getCatalogCategories().subscribe({
      next: value => {
        this.categories.set(value);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load categories.');
        this.loading.set(false);
      },
    });
  }

  add() {
    const name = this.newName.trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set('');
    this.admin.createCatalogCategory(name).subscribe({
      next: item => {
        this.categories.update(value => [...value, item]);
        this.newName = '';
        this.saving.set(false);
      },
      error: error => {
        this.error.set(error.error?.detail || 'Could not add category.');
        this.saving.set(false);
      },
    });
  }

  toggle(item: CatalogCategory) {
    this.admin.toggleCatalogCategory(item.id).subscribe(updated => {
      this.categories.update(value =>
        value.map(category => category.id === updated.id ? updated : category)
      );
    });
  }
}
