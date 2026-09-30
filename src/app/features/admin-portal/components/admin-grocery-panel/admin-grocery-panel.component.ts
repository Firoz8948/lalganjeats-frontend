import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import {
  AdminService,
  AdminShelf,
  AdminShelfProduct,
  AdminShelfSave,
  CatalogSubcategory,
} from '../../../../core/services/admin.service';

type Draft = Omit<AdminShelfSave, 'product_ids'> & { id: number | null };

const GROCERY_SLUG = 'grocery';
/** Fallback when the catalog has no "grocery" slug (production id). */
const GROCERY_CATEGORY_ID = 2;

@Component({
  selector: 'app-admin-grocery-panel',
  standalone: true,
  imports: [FormsModule, PortalPageHeaderComponent],
  templateUrl: './admin-grocery-panel.component.html',
  styleUrl: './admin-grocery-panel.component.scss',
})
export class AdminGroceryPanelComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categoryId = signal(0);
  readonly shelves = signal<AdminShelf[]>([]);
  readonly subcategories = signal<CatalogSubcategory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  readonly draft = signal<Draft | null>(null);
  readonly selected = signal<AdminShelfProduct[]>([]);
  readonly searchResults = signal<AdminShelfProduct[]>([]);
  readonly searching = signal(false);
  searchText = '';
  private readonly search$ = new Subject<string>();

  readonly selectedIds = computed(() => new Set(this.selected().map((p) => p.id)));
  readonly sortedShelves = computed(() =>
    [...this.shelves()].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
  );

  ngOnInit() {
    this.search$
      .pipe(
        debounceTime(250),
        switchMap((q) => {
          this.searching.set(true);
          return this.admin.searchShelfProducts(this.categoryId(), q);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.searchResults.set(rows);
          this.searching.set(false);
        },
        error: () => this.searching.set(false),
      });

    this.admin.getCatalogCategories().subscribe({
      next: (categories) => {
        const grocery = categories.find((c) => c.slug === GROCERY_SLUG)
          ?? categories.find((c) => c.id === GROCERY_CATEGORY_ID);
        if (!grocery) {
          this.error.set('No Grocery category found in the catalog.');
          this.loading.set(false);
          return;
        }
        this.categoryId.set(grocery.id);
        this.loadShelves();
        this.admin.getCatalogSubcategories(grocery.id).subscribe({
          next: (rows) => this.subcategories.set(rows.filter((s) => s.is_active)),
        });
      },
      error: () => {
        this.error.set('Could not load categories.');
        this.loading.set(false);
      },
    });
  }

  loadShelves() {
    this.loading.set(true);
    this.admin.getShelves(this.categoryId()).subscribe({
      next: (rows) => {
        this.shelves.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load sections.');
        this.loading.set(false);
      },
    });
  }

  startNew() {
    const nextOrder = this.shelves().reduce((max, s) => Math.max(max, s.sort_order), 0) + 1;
    this.openEditor({
      id: null,
      title: '',
      sort_order: nextOrder,
      section_bg_color: '#ffffff',
      image_bg_color: '#f1fbf4',
      card_bg_color: '#ffffff',
      view_all_subcategory_id: null,
      is_active: true,
    }, []);
  }

  edit(shelf: AdminShelf) {
    const { products, business_category_id: _, ...fields } = shelf;
    this.openEditor({ ...fields }, products);
  }

  cancel() {
    this.draft.set(null);
    this.error.set('');
  }

  onSearch(text: string) {
    this.search$.next(text.trim());
  }

  addProduct(product: AdminShelfProduct) {
    if (this.selectedIds().has(product.id)) return;
    this.selected.update((list) => [...list, product]);
  }

  removeProduct(id: number) {
    this.selected.update((list) => list.filter((p) => p.id !== id));
  }

  moveProduct(index: number, step: -1 | 1) {
    this.selected.update((list) => {
      const target = index + step;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  patchDraft(patch: Partial<Draft>) {
    this.draft.update((d) => (d ? { ...d, ...patch } : d));
  }

  save() {
    const draft = this.draft();
    if (!draft) return;
    if (!draft.title.trim()) {
      this.error.set('Add a heading for this section.');
      return;
    }
    const { id, ...fields } = draft;
    const body: AdminShelfSave = {
      ...fields,
      title: fields.title.trim(),
      sort_order: Math.max(0, Math.round(Number(fields.sort_order) || 0)),
      product_ids: this.selected().map((p) => p.id),
    };
    this.saving.set(true);
    this.error.set('');
    const request = id == null
      ? this.admin.createShelf(this.categoryId(), body)
      : this.admin.updateShelf(id, body);
    request.subscribe({
      next: (saved) => {
        this.shelves.update((list) =>
          id == null ? [...list, saved] : list.map((s) => (s.id === saved.id ? saved : s)),
        );
        this.saving.set(false);
        this.draft.set(null);
        this.flash(id == null ? 'Section added.' : 'Section saved.');
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e.error?.detail || 'Could not save this section.');
      },
    });
  }

  remove(shelf: AdminShelf) {
    if (!confirm(`Delete the section "${shelf.title}"?`)) return;
    this.admin.deleteShelf(shelf.id).subscribe({
      next: () => {
        this.shelves.update((list) => list.filter((s) => s.id !== shelf.id));
        if (this.draft()?.id === shelf.id) this.draft.set(null);
        this.flash('Section deleted.');
      },
      error: () => this.error.set('Could not delete this section.'),
    });
  }

  subcategoryName(id: number | null): string {
    if (id == null) return 'All grocery products';
    return this.subcategories().find((s) => s.id === id)?.name ?? 'Subcategory';
  }

  private openEditor(draft: Draft, products: AdminShelfProduct[]) {
    this.draft.set(draft);
    this.selected.set([...products]);
    this.searchText = '';
    this.error.set('');
    this.search$.next('');
  }

  private flash(message: string) {
    this.success.set(message);
    setTimeout(() => this.success.set(''), 2500);
  }
}
