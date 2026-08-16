import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeliveryPortalService,
  DpDashboard,
  DpOrder,
} from '../../services/delivery-portal.service';

@Component({
  selector: 'app-dp-home',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalPageHeaderComponent],
  templateUrl: './dp-home.component.html',
  styleUrl: './dp-home.component.scss',
})
export class DpHomeComponent implements OnInit, OnDestroy {
  private api = inject(DeliveryPortalService);

  data = signal<DpDashboard | null>(null);
  error = signal('');
  busyId = signal<number | null>(null);
  otp = '';
  lastDevOtp = signal('');
  private poll?: ReturnType<typeof setInterval>;
  private geoWatch?: number;

  ngOnInit() {
    this.refresh();
    this.poll = setInterval(() => this.refresh(), 5000);
    this.startGeo();
  }

  ngOnDestroy() {
    if (this.poll) clearInterval(this.poll);
    if (this.geoWatch != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.geoWatch);
    }
  }

  refresh() {
    this.api.dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: (e) => this.error.set(e.error?.detail || 'Failed to load'),
    });
  }

  startGeo() {
    if (!navigator.geolocation) return;
    this.geoWatch = navigator.geolocation.watchPosition(
      (pos) => {
        this.api.pingLocation(pos.coords.latitude, pos.coords.longitude).subscribe({ error: () => {} });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  toggleOnline() {
    this.api.toggleOnline().subscribe({ next: () => this.refresh() });
  }

  accept(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.accept(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Accept failed'); },
    });
  }

  reject(o: DpOrder) {
    this.busyId.set(o.id);
    this.api.reject(o.id).subscribe({
      next: () => { this.busyId.set(null); this.refresh(); },
      error: (e) => { this.busyId.set(null); this.error.set(e.error?.detail || 'Reject failed'); },
    });
  }

  pickedUp(o: DpOrder) {
    this.api.pickedUp(o.id).subscribe({ next: () => this.refresh() });
  }

  sendOtp(o: DpOrder) {
    this.api.sendOtp(o.id).subscribe({
      next: (r) => {
        if (r.dev_otp) this.lastDevOtp.set(r.dev_otp);
        this.refresh();
      },
    });
  }

  complete(o: DpOrder, method: 'cash' | 'online') {
    if (!this.otp.trim()) {
      this.error.set('Enter customer OTP');
      return;
    }
    this.api.complete(o.id, this.otp.trim(), method).subscribe({
      next: () => { this.otp = ''; this.lastDevOtp.set(''); this.refresh(); },
      error: (e) => this.error.set(e.error?.detail || 'Complete failed'),
    });
  }
}
