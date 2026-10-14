import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminMenuItem, AdminMenuItemCreate, AdminService, CatalogSubcategory, MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '../../../../core/services/admin.service';
import { PaymentSettingsService } from '../../../../core/services/payment-settings.service';

type VariantDraft = { label: string; actual_price: number | null; price: number | null; original_price: number | null };
type MenuGroup = { name: string; items: AdminMenuItem[]; available: number };

@Component({
  selector: 'app-admin-restaurant-menu',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-restaurant-menu.component.html',
  styleUrl: './admin-restaurant-menu.component.scss',
})
export class AdminRestaurantMenuComponent implements OnInit {
  restaurantId = 0;
  restaurantName = signal('');
  restaurantOpen = signal<boolean | null>(null);
  businessCategoryId = signal(0);
  notFound = signal(false);

  menuItems = signal<AdminMenuItem[]>([]);
  menuLoading = signal(false);
  menuSaving = signal(false);
  menuError = signal('');
  menuSuccess = signal('');
  deletingId = signal<number | null>(null);
  togglingId = signal<number | null>(null);
  menuSubcategories = signal<CatalogSubcategory[]>([]);
  displayPriceMarkup = signal(30);
  editingMenuItemId = signal<number | null>(null);
  menuImagePreview = signal<string | null>(null);
  menuImageUploading = signal(false);
  hasVariants = signal(false);
  variantDrafts: VariantDraft[] = [];
  newMenuItem: AdminMenuItemCreate = this.blankItem();
  readonly maxImageMb = MAX_IMAGE_UPLOAD_MB;

  query = signal('');
  activeCategory = signal<string>('all');

  readonly allGroups = computed<MenuGroup[]>(() => this.groupItems(this.menuItems()));

  readonly visibleGroups = computed<MenuGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    const active = this.activeCategory();
    const items = q
      ? this.menuItems().filter(item =>
          item.name.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q))
      : this.menuItems();
    const groups = this.groupItems(items);
    return active === 'all' ? groups : groups.filter(group => group.name === active);
  });

  readonly totals = computed(() => {
    const items = this.menuItems();
    return { total: items.length, available: items.filter(item => item.is_available).length };
  });

  constructor(
    private route: ActivatedRoute,
    private admin: AdminService,
    private paymentSettings: PaymentSettingsService,
  ) {}

  ngOnInit() {
    this.restaurantId = Number(this.route.snapshot.paramMap.get('id')) || 0;
    if (!this.restaurantId) {
      this.notFound.set(true);
      return;
    }
    this.loadRestaurant();
    this.loadMenu();
    this.paymentSettings.getSettings().subscribe({
      next: s => this.displayPriceMarkup.set(s.display_price_markup_percent),
      error: () => this.displayPriceMarkup.set(30),
    });
  }

  private blankItem(): AdminMenuItemCreate {
    return { name: '', description: '', image_url: null, price: 0, actual_price: 0, category_name: 'Other', subcategory_id: null, is_veg: true, is_bestseller: false };
  }

  private groupItems(items: AdminMenuItem[]): MenuGroup[] {
    const map = new Map<string, AdminMenuItem[]>();
    for (const item of items) {
      const key = item.category?.trim() || 'Other';
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, groupItems]) => ({ name, items: groupItems, available: groupItems.filter(item => item.is_available).length }));
  }

  loadRestaurant() {
    this.admin.getRestaurants().subscribe({
      next: rows => {
        const row = rows.find(r => r.id === this.restaurantId);
        if (!row) {
          this.notFound.set(true);
          return;
        }
        this.restaurantName.set(row.name);
        this.restaurantOpen.set(row.is_open);
        this.businessCategoryId.set(row.business_category_id || 0);
        this.loadMenuSubcategories();
      },
      error: () => this.menuError.set('Could not load restaurant details.'),
    });
  }

  loadMenuSubcategories() {
    if (!this.businessCategoryId()) {
      this.menuSubcategories.set([]);
      return;
    }
    this.admin.getCatalogSubcategories(this.businessCategoryId())
      .subscribe(items => this.menuSubcategories.set(items.filter(item => item.is_active)));
  }

  loadMenu() {
    this.menuLoading.set(true);
    this.admin.getRestaurantMenu(this.restaurantId).subscribe({
      next: items => {
        this.menuItems.set(items);
        this.menuLoading.set(false);
        const active = this.activeCategory();
        if (active !== 'all' && !this.allGroups().some(group => group.name === active)) this.activeCategory.set('all');
      },
      error: () => {
        this.menuLoading.set(false);
        this.menuError.set('Could not load menu items.');
      },
    });
  }

  calculatedDisplayPrice(transfer: number | null | undefined) {
    const t = Number(transfer) || 0;
    return Math.round(t * (1 + this.displayPriceMarkup() / 100) * 100) / 100;
  }

  enableVariants() {
    this.hasVariants.set(true);
    this.variantDrafts = [
      { label: 'Half', actual_price: null, price: null, original_price: null },
      { label: 'Full', actual_price: null, price: null, original_price: null },
    ];
  }

  disableVariants() {
    this.hasVariants.set(false);
    this.variantDrafts = [];
  }

  addVariantRow() {
    this.variantDrafts = [...this.variantDrafts, { label: '', actual_price: null, price: null, original_price: null }];
  }

  removeVariantRow(index: number) {
    if (this.variantDrafts.length <= 1) return;
    this.variantDrafts = this.variantDrafts.filter((_, i) => i !== index);
  }

  onItemTransferChange() {
    if (this.editingMenuItemId()) return;
    this.newMenuItem.price = this.calculatedDisplayPrice(this.newMenuItem.actual_price);
  }

  onVariantTransferChange(row: VariantDraft) {
    if (this.editingMenuItemId() && row.price) return;
    row.price = this.calculatedDisplayPrice(row.actual_price);
  }

  fillSuggestedDisplay() {
    this.newMenuItem.price = this.calculatedDisplayPrice(this.newMenuItem.actual_price);
  }

  fillSuggestedVariantDisplay(row: VariantDraft) {
    row.price = this.calculatedDisplayPrice(row.actual_price);
  }

  resetMenu() {
    this.editingMenuItemId.set(null);
    this.newMenuItem = this.blankItem();
    this.menuImagePreview.set(null);
    this.menuImageUploading.set(false);
    this.disableVariants();
  }

  editMenuItem(item: AdminMenuItem) {
    this.editingMenuItemId.set(item.id);
    this.menuError.set('');
    this.menuSuccess.set('');
    this.newMenuItem = {
      name: item.name,
      description: item.description || '',
      image_url: item.image_url || null,
      price: item.price,
      actual_price: item.actual_price,
      original_price: item.original_price,
      category_name: item.category,
      subcategory_id: item.subcategory_id ?? null,
      is_veg: item.is_veg,
      is_bestseller: item.is_bestseller,
    };
    this.menuImagePreview.set(item.image_url || null);
    if (item.variants?.length) {
      this.hasVariants.set(true);
      this.variantDrafts = item.variants.map(v => ({
        label: v.label,
        actual_price: v.actual_price,
        price: v.price ?? this.calculatedDisplayPrice(v.actual_price),
        original_price: v.original_price ?? null,
      }));
    } else {
      this.disableVariants();
    }
    setTimeout(() => document.querySelector('.menu-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  selectMenuImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.menuError.set('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.menuError.set('Menu item image must be JPG, PNG, or WebP.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      this.menuError.set(`Menu item image must be ${MAX_IMAGE_UPLOAD_MB} MB or smaller.`);
      input.value = '';
      return;
    }
    this.menuImagePreview.set(URL.createObjectURL(file));
    this.menuImageUploading.set(true);
    this.admin.uploadBanner(file, 'menu_item').subscribe({
      next: r => {
        this.newMenuItem.image_url = r.url;
        this.menuImagePreview.set(r.url);
        this.menuImageUploading.set(false);
        input.value = '';
      },
      error: e => {
        this.menuImagePreview.set(null);
        this.newMenuItem.image_url = null;
        this.menuImageUploading.set(false);
        this.menuError.set(e.error?.detail || 'Failed to upload menu item image.');
        input.value = '';
      },
    });
  }

  removeMenuImage() {
    this.menuImagePreview.set(null);
    this.newMenuItem.image_url = null;
  }

  addItem() {
    this.menuError.set('');
    this.menuSuccess.set('');
    if (!this.newMenuItem.name.trim()) { this.menuError.set('Item name is required.'); return; }
    if (!this.newMenuItem.subcategory_id) { this.menuError.set('Choose a subcategory.'); return; }
    const variants = this.hasVariants()
      ? this.variantDrafts
          .map(v => ({
            label: (v.label || '').trim(),
            actual_price: Number(v.actual_price) || 0,
            price: Number(v.price) || this.calculatedDisplayPrice(v.actual_price),
            original_price: v.original_price != null ? Number(v.original_price) : null,
          }))
          .filter(v => v.label && v.actual_price > 0)
      : [];
    if (this.hasVariants() && !variants.length) { this.menuError.set('Add at least one variant with its seller transfer price.'); return; }
    if (!this.hasVariants()) {
      const transfer = Number(this.newMenuItem.actual_price) || 0;
      const display = Number(this.newMenuItem.price) || this.calculatedDisplayPrice(transfer);
      if (transfer <= 0) { this.menuError.set('Seller transfer price is required.'); return; }
      if (display <= 0) { this.menuError.set('Display price is required.'); return; }
      this.newMenuItem.price = display;
      if (this.newMenuItem.original_price != null && Number(this.newMenuItem.original_price) < display) {
        this.menuError.set(`MRP cannot be lower than display ₹${display}.`);
        return;
      }
    } else {
      for (const v of variants) {
        if (v.price <= 0) { this.menuError.set(`Display price is required for ${v.label}.`); return; }
        if (v.original_price != null && v.original_price < v.price) {
          this.menuError.set(`MRP for ${v.label} cannot be lower than display ₹${v.price}.`);
          return;
        }
      }
    }
    const subcategory = this.menuSubcategories().find(item => item.id === Number(this.newMenuItem.subcategory_id));
    const payload: AdminMenuItemCreate = {
      ...this.newMenuItem,
      category_name: subcategory?.name || 'Other',
      actual_price: this.hasVariants() ? variants[0].actual_price : Number(this.newMenuItem.actual_price),
      original_price: this.hasVariants() ? variants[0].original_price : this.newMenuItem.original_price,
      price: this.hasVariants() ? variants[0].price : Number(this.newMenuItem.price),
      variants: this.hasVariants()
        ? variants.map(v => ({ label: v.label, actual_price: v.actual_price, price: v.price, original_price: v.original_price }))
        : undefined,
    };
    this.menuSaving.set(true);
    const editingId = this.editingMenuItemId();
    const request = editingId
      ? this.admin.updateMenuItem(this.restaurantId, editingId, payload)
      : this.admin.addMenuItem(this.restaurantId, payload);
    request.subscribe({
      next: () => {
        this.menuSuccess.set(editingId ? `Saved "${payload.name}".` : `Added "${payload.name}".`);
        this.resetMenu();
        this.menuSaving.set(false);
        this.loadMenu();
      },
      error: e => {
        const detail = e.error?.detail;
        this.menuError.set(typeof detail === 'string' ? detail : 'Failed to save item.');
        this.menuSaving.set(false);
      },
    });
  }

  toggleItem(item: AdminMenuItem) {
    this.togglingId.set(item.id);
    this.admin.toggleMenuItem(this.restaurantId, item.id).subscribe({
      next: r => {
        this.menuItems.update(items => items.map(x => x.id === item.id ? { ...x, is_available: r.is_available } : x));
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }

  deleteItem(item: AdminMenuItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.deletingId.set(item.id);
    this.admin.deleteMenuItem(this.restaurantId, item.id).subscribe({
      next: () => {
        this.menuItems.update(items => items.filter(x => x.id !== item.id));
        if (this.editingMenuItemId() === item.id) this.resetMenu();
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }
}
