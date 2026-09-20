import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
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
  imports: [FormsModule, PortalPageHeaderComponent],
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
  editingId = signal<number | null>(null);
  newZone: DeliveryZoneCreate = this.blankZone(0);
  editDraft: DeliveryZoneCreate & { is_active?: boolean } = this.blankZone(0);
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
        this.zones.set(this.sortZones(tenant.zones || []));
        this.deliveryExceptions.set(tenant.delivery_exceptions || []);
        this.newException.latitude = Number(tenant.center_latitude);
        this.newException.longitude = Number(tenant.center_longitude);
        this.newZone = this.blankZone();
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
    const error = this.rangeError(this.newZone);
    if (error) {
      this.zoneError.set(error);
      return;
    }
    this.zoneSaving.set(true);
    this.admin.createZone(this.newZone).subscribe({
      next: (zone) => {
        this.zones.update((list) => this.sortZones([...list, zone]));
        this.newZone = this.blankZone();
        this.zoneSaving.set(false);
        this.zoneSuccess.set('Zone added.');
      },
      error: (error) => {
        this.zoneSaving.set(false);
        this.zoneError.set(this.apiError(error, 'Failed to create zone.'));
      },
    });
  }

  startEdit(zone: DeliveryZone) {
    this.editingId.set(zone.id);
    this.editDraft = {
      name: zone.name,
      initial_km: Number(zone.initial_km ?? 0),
      final_km: Number(zone.final_km ?? zone.radius_km),
      pricing_type: zone.pricing_type,
      rate: Number(zone.rate),
      delivery_partner_rate: zone.delivery_partner_rate != null ? Number(zone.delivery_partner_rate) : Number(zone.rate),
      sort_order: zone.sort_order,
      is_active: zone.is_active,
      always_available: zone.always_available !== false,
      opening_time: zone.opening_time || '18:00',
      closing_time: zone.closing_time || '06:00',
    };
    this.zoneError.set('');
    this.zoneSuccess.set('');
    setTimeout(() => {
      document.querySelector('.zone-form--edit')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveCurrentEdit() {
    const id = this.editingId();
    const zone = this.zones().find((item) => item.id === id);
    if (!zone) return;
    this.saveEdit(zone);
  }

  saveEdit(zone: DeliveryZone) {
    const error = this.rangeError(this.editDraft);
    if (error) {
      this.zoneError.set(error);
      return;
    }
    this.zoneSaving.set(true);
    this.zoneError.set('');
    const payload: Partial<DeliveryZoneCreate & { is_active: boolean }> = {
      ...this.editDraft,
      opening_time: this.editDraft.always_available ? null : (this.editDraft.opening_time || null),
      closing_time: this.editDraft.always_available ? null : (this.editDraft.closing_time || null),
    };
    this.admin.updateZone(zone.id, payload).subscribe({
      next: (updated) => {
        this.zones.update((list) =>
          this.sortZones(list.map((item) => item.id === updated.id ? updated : item)),
        );
        this.editingId.set(null);
        this.zoneSaving.set(false);
        this.zoneSuccess.set('Zone updated.');
      },
      error: (err) => {
        this.zoneSaving.set(false);
        this.zoneError.set(this.apiError(err, 'Failed to update zone.'));
      },
    });
  }

  toggleActive(zone: DeliveryZone) {
    this.zoneSaving.set(true);
    this.admin.updateZone(zone.id, { is_active: !zone.is_active }).subscribe({
      next: (updated) => {
        this.zones.update((list) =>
          this.sortZones(list.map((item) => item.id === updated.id ? updated : item)),
        );
        this.zoneSaving.set(false);
        this.zoneSuccess.set(updated.is_active ? 'Zone activated.' : 'Zone deactivated.');
      },
      error: (err) => {
        this.zoneSaving.set(false);
        this.zoneError.set(this.apiError(err, 'Failed to update zone status.'));
      },
    });
  }

  deleteZone(zone: DeliveryZone) {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    this.admin.deleteZone(zone.id).subscribe({
      next: () => {
        this.zones.update((list) => list.filter((item) => item.id !== zone.id));
        if (this.editingId() === zone.id) this.editingId.set(null);
        this.newZone = this.blankZone();
      },
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

  private blankZone(start?: number): DeliveryZoneCreate {
    const nextStart = start ?? this.zones().reduce(
      (max, zone) => Math.max(max, Number(zone.final_km ?? zone.radius_km) || 0),
      0,
    );
    return {
      name: '',
      initial_km: nextStart,
      final_km: nextStart + 2,
      pricing_type: 'flat',
      rate: 30,
      delivery_partner_rate: 30,
      sort_order: 0,
      always_available: true,
      opening_time: '18:00',
      closing_time: '06:00',
    };
  }

  private sortZones(list: DeliveryZone[]): DeliveryZone[] {
    return [...list].sort(
      (a, b) => Number(a.initial_km ?? 0) - Number(b.initial_km ?? 0),
    );
  }

  private rangeError(zone: DeliveryZoneCreate): string | null {
    if (!zone.name.trim()) return 'Zone name is required.';
    if (zone.initial_km < 0) return 'Initial range cannot be negative.';
    if (Number(zone.final_km) <= Number(zone.initial_km)) {
      return 'Final range must be greater than initial range.';
    }
    if (!zone.always_available && (!zone.opening_time || !zone.closing_time)) {
      return 'Opening and closing time are required when Always available is off.';
    }
    return null;
  }

  private apiError(error: { error?: { detail?: unknown } }, fallback: string): string {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    return fallback;
  }
}
