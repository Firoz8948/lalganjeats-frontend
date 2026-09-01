import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  PaymentSettingsService,
  PaymentSettings,
} from '../../../../core/services/payment-settings.service';

@Component({
  selector: 'app-payment-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PortalPageHeaderComponent],
  templateUrl: './payment-settings.component.html',
  styleUrl: './payment-settings.component.scss',
})
export class PaymentSettingsComponent implements OnInit {
  readonly previewTransferPrice = 100;
  readonly previewZoneDeliveryCharge = 30;
  readonly markupPresets = [10, 20, 30];

  form!: FormGroup;
  loading = false;
  saving = false;
  success = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private service: PaymentSettingsService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      platform_fee_percent: [0, [Validators.min(0), Validators.max(100)]],
      platform_charge_rupees: [2, [Validators.required, Validators.min(0)]],
      display_price_markup_percent: [30, [Validators.required, Validators.min(0), Validators.max(500)]],
      allow_prepaid_orders: [true],
      allow_cod_orders: [true],
      cod_max_order_amount: [500, [Validators.required, Validators.min(0)]],
    });
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.service.getSettings().subscribe({
      next: (data: PaymentSettings) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load settings';
        this.loading = false;
      },
    });
  }

  setMarkup(percent: number): void {
    this.form.get('display_price_markup_percent')?.setValue(percent);
  }

  get previewDisplayPrice(): number {
    const markup = Number(this.form.get('display_price_markup_percent')?.value) || 0;
    return Math.round(this.previewTransferPrice * (1 + markup / 100) * 100) / 100;
  }

  get adminProfitPreview(): number {
    const platformCharge =
      Number(this.form.get('platform_charge_rupees')?.value) || 0;
    // Delivery is pass-through: customer pays it, rider receives it.
    return this.previewDisplayPrice - this.previewTransferPrice + platformCharge;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.success = false;
    this.error = '';

    this.service.updateSettings(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.success = true;
        setTimeout(() => (this.success = false), 3000);
      },
      error: () => {
        this.saving = false;
        this.error = 'Failed to save settings';
      },
    });
  }
}
