import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/services/cart.service';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';

@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss',
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cart = inject(CartService);

  status = signal<'success' | 'failed' | 'unknown'>('unknown');
  orderNumber = signal('');
  orderId = signal<number | null>(null);

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap;
    const raw = (q.get('status') || 'unknown').toLowerCase();
    if (raw === 'success' || raw === 'failed') {
      this.status.set(raw);
    } else {
      this.status.set('unknown');
    }
    this.orderNumber.set(q.get('order') || '');
    const id = Number(q.get('id') || 0);
    this.orderId.set(id > 0 ? id : null);

    if (this.status() === 'success') {
      this.cart.clearCart();
      try {
        sessionStorage.removeItem('le_pending_payu_order');
      } catch {
        /* ignore */
      }
    }
  }
}
