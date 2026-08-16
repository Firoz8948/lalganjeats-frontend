import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../home/components/navbar/navbar.component';
import { FooterComponent } from '../home/components/footer/footer.component';
import { PromoService, PublicPromo } from '../../core/services/promo.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.scss',
})
export class OffersComponent implements OnInit {
  private promos = inject(PromoService);

  items = signal<PublicPromo[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit() {
    this.promos.listActive().subscribe({
      next: rows => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load offers right now.');
        this.loading.set(false);
      },
    });
  }
}
