import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  PromoCode,
  PromoCodeCreate,
  PromoUsage,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-promos',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalPageHeaderComponent],
  templateUrl: './admin-promos.component.html',
  styleUrl: './admin-promos.component.scss',
})
export class AdminPromosComponent implements OnInit {
  promos = signal<PromoCode[]>([]);
  promoSaving = signal(false);
  promoError = signal('');
  promoSuccess = signal('');
  usageModalOpen = signal(false);
  usagePromoCode = signal('');
  usages = signal<PromoUsage[]>([]);
  usagesLoading = signal(false);
  promoExpiresLocal = '';
  promoMaxUsesMode: 'unlimited' | 'custom' = 'custom';
  newPromo: PromoCodeCreate = {
    code: '',
    channel: 'all',
    percent_off: 10,
    free_delivery: false,
    expires_at: null,
    max_uses: 100,
    description: '',
    is_public: true,
  };

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.loadPromos();
  }

  loadPromos() {
    this.promoError.set('');
    this.admin.getPromos().subscribe({
      next: (rows) => this.promos.set(rows),
      error: (error) => this.promoError.set(
        typeof error.error?.detail === 'string'
          ? error.error.detail
          : 'Failed to load promocodes.',
      ),
    });
  }

  createPromo() {
    this.promoError.set('');
    this.promoSuccess.set('');
    if (!this.newPromo.code.trim()) {
      this.promoError.set('Code is required.');
      return;
    }
    if (this.promoMaxUsesMode === 'custom' && !(this.newPromo.max_uses >= 1)) {
      this.promoError.set('Enter a custom max uses of at least 1.');
      return;
    }
    if (!this.newPromo.free_delivery && !(this.newPromo.percent_off && this.newPromo.percent_off > 0)) {
      this.promoError.set('Set percent off and/or free delivery.');
      return;
    }

    const payload: PromoCodeCreate = {
      ...this.newPromo,
      code: this.newPromo.code.trim().toUpperCase(),
      max_uses: this.promoMaxUsesMode === 'unlimited' ? 0 : Number(this.newPromo.max_uses),
      expires_at: this.promoExpiresLocal
        ? new Date(this.promoExpiresLocal).toISOString()
        : null,
      percent_off: this.newPromo.percent_off || null,
    };
    this.promoSaving.set(true);
    this.admin.createPromo(payload).subscribe({
      next: () => {
        this.promoSaving.set(false);
        this.promoSuccess.set('Promocode created.');
        this.newPromo = {
          code: '', channel: 'all', percent_off: 10, free_delivery: false,
          expires_at: null, max_uses: 100, description: '', is_public: true,
        };
        this.promoMaxUsesMode = 'custom';
        this.promoExpiresLocal = '';
        this.loadPromos();
      },
      error: (error) => {
        this.promoSaving.set(false);
        const detail = error.error?.detail;
        this.promoError.set(
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((item: any) => item.msg).join('. ')
              : 'Failed to create.',
        );
      },
    });
  }

  togglePromo(promo: PromoCode) {
    this.admin.updatePromo(promo.id, { is_active: !promo.is_active }).subscribe({
      next: () => this.loadPromos(),
    });
  }

  deletePromo(promo: PromoCode) {
    if (!confirm(`Delete promocode ${promo.code}?`)) return;
    this.admin.deletePromo(promo.id).subscribe({ next: () => this.loadPromos() });
  }

  openUsage(promo: PromoCode) {
    this.usagePromoCode.set(promo.code);
    this.usageModalOpen.set(true);
    this.usagesLoading.set(true);
    this.usages.set([]);
    this.admin.getPromoUsages(promo.id).subscribe({
      next: (rows) => { this.usages.set(rows); this.usagesLoading.set(false); },
      error: () => this.usagesLoading.set(false),
    });
  }

  closeUsage() {
    this.usageModalOpen.set(false);
  }
}
