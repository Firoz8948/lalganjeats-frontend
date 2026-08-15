import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SuperadminService,
  TenantCreatePayload,
  TenantDetail,
  TenantListItem,
  TenantUpdatePayload,
} from '../../../../core/services/superadmin.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.scss',
})
export class SuperadminDashboardComponent implements OnInit {
  stats = signal<{
    total_tenants: number;
    active_tenants: number;
    total_restaurants: number;
  } | null>(null);
  tenants = signal<TenantListItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  formError = signal('');
  formSuccess = signal('');
  showCreate = signal(false);
  showEdit = signal(false);
  editingId = signal<number | null>(null);
  editLoading = signal(false);
  impersonatingId = signal<number | null>(null);

  form: TenantCreatePayload = this.emptyForm();
  editForm: TenantUpdatePayload & {
    admin_password?: string;
  } = {};

  constructor(
    private api: SuperadminService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.reload();
  }

  emptyForm(): TenantCreatePayload {
    return {
      name: '',
      slug: '',
      admin_email: '',
      admin_password: '',
      admin_full_name: '',
      center_latitude: 26.1635,
      center_longitude: 80.9345,
      center_address: '',
      one_time_fee: 0,
      platform_charge_percent: 5,
      bank_account_holder_name: '',
      bank_account_number: '',
      bank_ifsc_code: '',
      bank_name: '',
    };
  }

  reload() {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data.stats);
        this.tenants.set(data.tenants);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.form = this.emptyForm();
    this.formError.set('');
    this.formSuccess.set('');
    this.showCreate.set(true);
  }

  closeCreate() {
    this.showCreate.set(false);
  }

  createTenant() {
    this.formError.set('');
    this.formSuccess.set('');

    if (!this.form.name.trim() || !this.form.admin_email.trim() || !this.form.admin_password) {
      this.formError.set('Name, admin email and password are required.');
      return;
    }
    if (!this.form.center_address.trim()) {
      this.formError.set('Centre address is required.');
      return;
    }

    const payload: TenantCreatePayload = {
      ...this.form,
      slug: this.form.slug?.trim() || undefined,
      admin_full_name: this.form.admin_full_name?.trim() || undefined,
      bank_account_holder_name: this.form.bank_account_holder_name?.trim() || undefined,
      bank_account_number: this.form.bank_account_number?.trim() || undefined,
      bank_ifsc_code: this.form.bank_ifsc_code?.trim() || undefined,
      bank_name: this.form.bank_name?.trim() || undefined,
    };

    this.saving.set(true);
    this.api.createTenant(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.formSuccess.set('Tenant admin created successfully.');
        this.showCreate.set(false);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(this.readError(err, 'Failed to create tenant.'));
      },
    });
  }

  openEdit(t: TenantListItem) {
    this.formError.set('');
    this.formSuccess.set('');
    this.editingId.set(t.id);
    this.showEdit.set(true);
    this.editLoading.set(true);
    this.api.getTenant(t.id).subscribe({
      next: (detail: TenantDetail) => {
        this.editForm = {
          name: detail.name,
          admin_email: detail.admin_email || '',
          admin_full_name: detail.admin_full_name || '',
          admin_password: '',
          center_latitude: Number(detail.center_latitude),
          center_longitude: Number(detail.center_longitude),
          center_address: detail.center_address,
          one_time_fee: Number(detail.one_time_fee),
          platform_charge_percent: Number(detail.platform_charge_percent),
          bank_account_holder_name: detail.bank_account_holder_name || '',
          bank_account_number: detail.bank_account_number || '',
          bank_ifsc_code: detail.bank_ifsc_code || '',
          bank_name: detail.bank_name || '',
          is_active: detail.is_active,
        };
        this.editLoading.set(false);
      },
      error: (err) => {
        this.editLoading.set(false);
        this.formError.set(this.readError(err, 'Failed to load tenant.'));
      },
    });
  }

  closeEdit() {
    this.showEdit.set(false);
    this.editingId.set(null);
  }

  saveEdit() {
    const id = this.editingId();
    if (!id) return;

    this.formError.set('');
    if (!this.editForm.name?.trim() || !this.editForm.center_address?.trim()) {
      this.formError.set('Name and centre address are required.');
      return;
    }

    const payload: TenantUpdatePayload = {
      name: this.editForm.name!.trim(),
      admin_email: this.editForm.admin_email?.trim() || undefined,
      admin_full_name: this.editForm.admin_full_name?.trim() || undefined,
      center_latitude: Number(this.editForm.center_latitude),
      center_longitude: Number(this.editForm.center_longitude),
      center_address: this.editForm.center_address!.trim(),
      one_time_fee: Number(this.editForm.one_time_fee ?? 0),
      platform_charge_percent: Number(this.editForm.platform_charge_percent ?? 0),
      bank_account_holder_name: this.editForm.bank_account_holder_name?.trim() || null,
      bank_account_number: this.editForm.bank_account_number?.trim() || null,
      bank_ifsc_code: this.editForm.bank_ifsc_code?.trim() || null,
      bank_name: this.editForm.bank_name?.trim() || null,
      is_active: this.editForm.is_active,
    };
    if (this.editForm.admin_password?.trim()) {
      payload.admin_password = this.editForm.admin_password.trim();
    }

    this.saving.set(true);
    this.api.updateTenant(id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.formSuccess.set('Tenant updated successfully.');
        this.closeEdit();
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(this.readError(err, 'Failed to update tenant.'));
      },
    });
  }

  toggleActive(t: TenantListItem) {
    const req = t.is_active
      ? this.api.deactivateTenant(t.id)
      : this.api.activateTenant(t.id);
    req.subscribe({ next: () => this.reload() });
  }

  impersonate(t: TenantListItem) {
    if (!confirm(`Enter admin panel as "${t.name}"?`)) return;
    this.impersonatingId.set(t.id);
    this.api.impersonate(t.id).subscribe({
      next: (session) => {
        this.auth.startImpersonation({
          access_token: session.access_token,
          role: session.role,
          user_id: session.user_id,
          full_name: session.full_name,
          redirect_to: session.redirect_to || '/admin/dashboard',
        });
        this.impersonatingId.set(null);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.impersonatingId.set(null);
        alert(this.readError(err, 'Impersonation failed.'));
      },
    });
  }

  logout() {
    this.auth.logout();
  }

  get user() {
    return this.auth.currentUser();
  }

  private readError(err: any, fallback: string): string {
    const d = err?.error?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
      return d.map((x: any) => x.msg).filter(Boolean).join('. ') || fallback;
    }
    return fallback;
  }
}
