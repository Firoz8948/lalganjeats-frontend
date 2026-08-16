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
  items      = signal<MenuItem[]>([]);
  categories = signal<MenuCategory[]>([]);
  loading    = signal(true);

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
      next: (cats) => this.categories.set(cats)
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
}
