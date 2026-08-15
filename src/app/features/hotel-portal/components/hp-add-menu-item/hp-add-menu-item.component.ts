// features/hotel-portal/components/hp-add-menu-item/hp-add-menu-item.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  HotelPortalService,
  MenuCategory
} from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-add-menu-item',
  standalone: true,
  imports: [CommonModule, FormsModule, HpIconComponent],
  templateUrl: './hp-add-menu-item.component.html',
  styleUrl:    './hp-add-menu-item.component.scss'
})
export class HpAddMenuItemComponent implements OnInit {
  categories = signal<MenuCategory[]>([]);
  saving     = signal(false);
  error      = signal('');

  form = {
    name:           '',
    description:    '',
    price:          null as number | null,
    original_price: null as number | null,
    category_id:    null as number | null,
    is_veg:         true,
    is_available:   true,
    is_bestseller:  false,
  };

  constructor(
    private service: HotelPortalService,
    private router:  Router
  ) {}

  ngOnInit() {
    this.service.getCategories().subscribe({
      next: (cats) => this.categories.set(cats)
    });
  }

  submit() {
    if (!this.form.name || !this.form.price) {
      this.error.set('Name and price are required.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    this.service.addMenuItem(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/hotel-portal/menu']);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Failed to add item.');
        this.saving.set(false);
      }
    });
  }

  goBack() { this.router.navigate(['/hotel-portal/menu']); }
}
