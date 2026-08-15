// features/hotel-portal/components/hp-shop-toggle/hp-shop-toggle.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal } from '@angular/core';
import { HotelPortalService } from '../../services/hotel-portal.service';
import { HpIconComponent } from '../shared/hp-icon/hp-icon.component';

@Component({
  selector: 'app-hp-shop-toggle',
  standalone: true,
  imports: [CommonModule, HpIconComponent],
  templateUrl: './hp-shop-toggle.component.html',
  styleUrl:    './hp-shop-toggle.component.scss'
})
export class HpShopToggleComponent {
  isOpen  = signal(false);
  toggling = signal(false);

  constructor(private service: HotelPortalService) {}

  toggle() {
    this.toggling.set(true);
    this.service.toggleShopStatus().subscribe({
      next: (res) => {
        this.isOpen.set(res.is_open);
        this.toggling.set(false);
      },
      error: () => this.toggling.set(false)
    });
  }
}
