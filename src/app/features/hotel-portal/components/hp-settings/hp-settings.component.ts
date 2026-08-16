import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
// features/hotel-portal/components/hp-settings/hp-settings.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotelPortalService } from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, HpIconComponent, PortalPageHeaderComponent],
  templateUrl: './hp-settings.component.html',
  styleUrl:    './hp-settings.component.scss'
})
export class HpSettingsComponent implements OnInit {
  settings = signal<any>(null);
  loading  = signal(true);
  saving   = signal(false);
  saved    = signal(false);

  form = {
    restaurant_name:    '',
    phone:              '',
    address:            '',
    min_order_amount:   0,
    delivery_fee:       0,
    free_delivery_above: 0,
    notif_new_order:    true,
  };

  constructor(private service: HotelPortalService) {}

  ngOnInit() {
    this.service.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        // Merge backend data into form
        Object.assign(this.form, {
          restaurant_name:     data.restaurant_name     ?? '',
          phone:               data.phone               ?? '',
          address:             data.address             ?? '',
          min_order_amount:    data.min_order_amount    ?? 0,
          delivery_fee:        data.delivery_fee        ?? 0,
          free_delivery_above: data.free_delivery_above ?? 0,
          notif_new_order:     data.notif_new_order     ?? true,
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save() {
    this.saving.set(true);
    this.service.updateSettings(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => this.saving.set(false)
    });
  }
}
