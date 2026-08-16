import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  DeliveryZone,
  DeliveryZoneCreate,
  DeliveryException,
  DeliveryExceptionCreate,
  TenantCentre,
} from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-zones',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-zones.component.html',
  styleUrl: './admin-zones.component.scss',
})
export class AdminZonesComponent implements OnInit {
  tenant = signal<TenantCentre | null>(null);
  zones = signal<DeliveryZone[]>([]);
  deliveryExceptions = signal<DeliveryException[]>([]);
  zoneSaving = signal(false);
  zoneError = signal('');
  zoneSuccess = signal('');
  newZone: DeliveryZoneCreate = {
    name: '', radius_km: 2, pricing_type: 'flat', rate: 30, sort_order: 0,
  };
  newException: DeliveryExceptionCreate = {
    name: '',
    latitude: 26.1635,
    longitude: 80.9345,
    radius_meters: 500,
    delivery_charge: 50,
  };

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.loadZones();
  }

  loadZones() {
    this.zoneError.set('');
    this.admin.getTenant().subscribe({
      next: (tenant) => {
        this.tenant.set(tenant);
        this.zones.set(tenant.zones || []);
        this.deliveryExceptions.set(tenant.delivery_exceptions || []);
        this.newException.latitude = Number(tenant.center_latitude);
        this.newException.longitude = Number(tenant.center_longitude);
      },
      error: (error) => this.zoneError.set(
        typeof error.error?.detail === 'string'
          ? error.error.detail
          : 'Failed to load tenant / zones.',
      ),
    });
  }

  createZone() {
    this.zoneError.set('');
    this.zoneSuccess.set('');
    if (!this.newZone.name.trim() || this.newZone.radius_km <= 0) {
      this.zoneError.set('Zone name and radius are required.');
      return;
    }
    this.zoneSaving.set(true);
    this.admin.createZone(this.newZone).subscribe({
      next: (zone) => {
        this.zones.update((list) =>
          [...list, zone].sort((a, b) => Number(a.radius_km) - Number(b.radius_km)),
        );
        this.newZone = {
          name: '', radius_km: 2, pricing_type: 'flat', rate: 30, sort_order: 0,
        };
        this.zoneSaving.set(false);
        this.zoneSuccess.set('Zone added.');
      },
      error: (error) => {
        this.zoneSaving.set(false);
        this.zoneError.set(
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Failed to create zone.',
        );
      },
    });
  }

  deleteZone(zone: DeliveryZone) {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    this.admin.deleteZone(zone.id).subscribe({
      next: () => this.zones.update((list) => list.filter((item) => item.id !== zone.id)),
    });
  }

  createDeliveryException() {
    this.zoneError.set('');
    this.zoneSuccess.set('');
    if (
      !this.newException.name.trim()
      || this.newException.radius_meters < 50
      || this.newException.delivery_charge < 0
    ) {
      this.zoneError.set('Exception name, radius (minimum 50 m) and charge are required.');
      return;
    }
    this.zoneSaving.set(true);
    this.admin.createDeliveryException(this.newException).subscribe({
      next: (item) => {
        this.deliveryExceptions.update((list) => [...list, item]);
        this.newException = {
          name: '',
          latitude: Number(this.tenant()?.center_latitude || 26.1635),
          longitude: Number(this.tenant()?.center_longitude || 80.9345),
          radius_meters: 500,
          delivery_charge: 50,
        };
        this.zoneSaving.set(false);
        this.zoneSuccess.set('Exception delivery location added.');
      },
      error: (error) => {
        this.zoneSaving.set(false);
        this.zoneError.set(
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Failed to create exception location.',
        );
      },
    });
  }

  deleteDeliveryException(item: DeliveryException) {
    if (!confirm(`Delete exception location "${item.name}"?`)) return;
    this.admin.deleteDeliveryException(item.id).subscribe({
      next: () => this.deliveryExceptions.update(
        (list) => list.filter((entry) => entry.id !== item.id),
      ),
    });
  }
}
