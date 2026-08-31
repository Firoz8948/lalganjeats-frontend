import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// features/hotel-portal/components/hp-menu-manage/hp-menu-manage.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HotelPortalService,
  MenuItem,
  MenuCategory
} from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-menu-manage',
  standalone: true,
  imports: [CommonModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-menu-manage.component.html',
  styleUrl:    './hp-menu-manage.component.scss'
})
export class HpMenuManageComponent implements OnInit {
  items           = signal<MenuItem[]>([]);
  categories      = signal<MenuCategory[]>([]);
  loading         = signal(true);
  showOrderModal  = signal(false);
  reorderCats     = signal<MenuCategory[]>([]);
  savingOrder     = signal(false);
  orderSuccess    = signal(false);
  orderError      = signal('');

  constructor(private service: HotelPortalService) {}

  ngOnInit() { this.loadMenu(); }

  loadMenu() {
    this.loading.set(true);
    this.service.getMenu().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.service.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.reorderCats.set([...cats]);
      }
    });
  }

  toggleAvailability(item: MenuItem) {
    this.service.toggleAvailability(item.id).subscribe({
      next: (res) => {
        this.items.update(list =>
          list.map(i => i.id === item.id
            ? { ...i, is_available: res.is_available }
            : i
          )
        );
      }
    });
  }

  getCategoryName(id: number | null): string {
    if (!id) return 'Uncategorized';
    return this.categories().find(c => c.id === id)?.name ?? 'Uncategorized';
  }

  itemCountForCat(catId: number): number {
    return this.items().filter(i => i.category_id === catId).length;
  }

  openOrderModal() {
    this.reorderCats.set([...this.categories()]);
    this.orderSuccess.set(false);
    this.orderError.set('');
    this.showOrderModal.set(true);
  }

  closeOrderModal() {
    this.showOrderModal.set(false);
  }

  moveCatUp(index: number) {
    if (index <= 0) return;
    const list = [...this.reorderCats()];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    this.reorderCats.set(list);
  }

  moveCatDown(index: number) {
    const list = [...this.reorderCats()];
    if (index >= list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;
    this.reorderCats.set(list);
  }

  saveCategoryOrder() {
    const ids = this.reorderCats().map(c => c.id);
    this.savingOrder.set(true);
    this.orderError.set('');
    this.service.reorderCategories(ids).subscribe({
      next: () => {
        this.categories.set([...this.reorderCats()]);
        this.savingOrder.set(false);
        this.orderSuccess.set(true);
        setTimeout(() => {
          this.closeOrderModal();
        }, 800);
      },
      error: () => {
        this.orderError.set('Could not save category order. Please try again.');
        this.savingOrder.set(false);
      }
    });
  }
}
