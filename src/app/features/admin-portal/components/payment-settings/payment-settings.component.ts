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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-settings.component.html',
  styleUrl: './payment-settings.component.scss',
})
export class PaymentSettingsComponent implements OnInit {
  readonly previewDisplayPrice = 100;
  readonly previewTransferPrice = 70;

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
      delivery_charge: [0, [Validators.required, Validators.min(0)]],
      free_delivery_above: [0, [Validators.required, Validators.min(0)]],
      delivery_boy_per_order_earning: [0, [Validators.required, Validators.min(0)]],
      platform_fee_percent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
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

  get adminProfitPreview(): number {
    const deliveryEarning =
      Number(this.form.get('delivery_boy_per_order_earning')?.value) || 0;
    return (
      this.previewDisplayPrice -
      this.previewTransferPrice -
      deliveryEarning
    );
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
