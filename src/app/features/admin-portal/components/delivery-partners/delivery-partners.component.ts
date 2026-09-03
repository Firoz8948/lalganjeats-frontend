import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  DeliveryDocumentPurpose,
  DeliveryPartner,
  DeliveryPartnerCreate,
  DeliveryUploadPurpose,
} from './delivery-partner.models';
import { DeliveryPartnerAdminService } from './delivery-partner.service';


const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyPartner = (): DeliveryPartnerCreate => ({
  full_name: '',
  phone: '',
  email: '',
  date_of_birth: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  joining_date: todayIso(),
  registered_vehicle_number: '',
  bike_info: '',
  selfie_url: '',
  rc_document_key: null,
  aadhaar_document_key: null,
  pan_document_key: null,
  bank_passbook_document_key: null,
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  bank_name: '',
  username: '',
  password: '',
});

@Component({
  selector: 'app-delivery-partners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-partners.component.html',
  styleUrl: './delivery-partners.component.scss',
})
export class DeliveryPartnersComponent implements OnInit {
  partners = signal<DeliveryPartner[]>([]);
  activeCount = computed(
    () => this.partners().filter((partner) => partner.is_active).length,
  );
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  error = signal('');
  success = signal('');
  uploading = signal<Partial<Record<DeliveryUploadPurpose, boolean>>>({});
  formData = emptyPartner();
  credDraft: Record<number, { username: string; password: string }> = {};
  multiBusyId = signal<number | null>(null);
  readonly maxDob = todayIso();
  readonly documents: {
    purpose: DeliveryDocumentPurpose;
    label: string;
    field: keyof DeliveryPartnerCreate;
  }[] = [
    { purpose: 'rc', label: 'Vehicle RC', field: 'rc_document_key' },
    { purpose: 'aadhaar', label: 'Aadhaar card', field: 'aadhaar_document_key' },
    { purpose: 'pan', label: 'PAN card', field: 'pan_document_key' },
    {
      purpose: 'bank_passbook',
      label: 'Bank passbook',
      field: 'bank_passbook_document_key',
    },
  ];

  constructor(private api: DeliveryPartnerAdminService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (partners) => {
        this.partners.set(partners);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load delivery partners.');
        this.loading.set(false);
      },
    });
  }

  openForm() {
    this.formData = emptyPartner();
    this.error.set('');
    this.success.set('');
    this.showForm.set(true);
  }

  completeProfile(partner: DeliveryPartner) {
    this.formData = {
      ...emptyPartner(),
      full_name: partner.full_name,
      phone: partner.phone,
      email: partner.email || '',
      registered_vehicle_number: partner.registered_vehicle_number || '',
    };
    this.error.set('');
    this.success.set('');
    this.showForm.set(true);
  }

  closeForm() {
    if (!this.saving()) this.showForm.set(false);
  }

  uploadFile(event: Event, purpose: DeliveryUploadPurpose) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.uploading.update((state) => ({ ...state, [purpose]: true }));
    this.api.upload(file, purpose).subscribe({
      next: (result) => {
        if (purpose === 'selfie') {
          this.formData.selfie_url = result.url || '';
        } else {
          const config = this.documents.find((item) => item.purpose === purpose);
          if (config) {
            (this.formData[config.field] as string | null) =
              result.document_key;
          }
        }
        this.uploading.update((state) => ({ ...state, [purpose]: false }));
      },
      error: (response) => {
        this.uploading.update((state) => ({ ...state, [purpose]: false }));
        this.error.set(
          response.error?.detail || `Could not upload ${purpose.replace('_', ' ')}.`,
        );
      },
    });
  }

  create(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      const labels: Record<string, string> = {
        full_name: 'Full name',
        phone: 'Phone',
        email: 'Email',
        date_of_birth: 'Date of birth',
        joining_date: 'Joining date',
        emergency_contact_name: 'Emergency contact name',
        emergency_contact_phone: 'Emergency contact phone',
        address: 'Address',
        registered_vehicle_number: 'Registered vehicle number',
        bike_info: 'Bike information',
        account_holder_name: 'Account holder',
        account_number: 'Account number',
        ifsc_code: 'IFSC code',
        bank_name: 'Bank name',
        username: 'Username',
        password: 'Password',
      };
      const invalidFields: string[] = [];
      for (const name of Object.keys(form.controls)) {
        if (form.controls[name].invalid) {
          invalidFields.push(labels[name] || name.replace(/_/g, ' '));
        }
      }
      this.error.set(
        invalidFields.length
          ? `Please check the following field(s): ${invalidFields.join(', ')}.`
          : 'Complete all required partner details.'
      );
      return;
    }
    if (!this.formData.selfie_url) {
      this.error.set('Upload the delivery partner selfie.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
  this.api.create({
      ...this.formData,
      username: this.formData.username?.trim() || undefined,
      password: this.formData.password?.trim() || undefined,
    }).subscribe({
      next: (partner) => {
        this.partners.update((items) => [partner, ...items]);
        this.saving.set(false);
        this.showForm.set(false);
        this.success.set(`${partner.full_name} was added successfully.`);
      },
      error: (response) => {
        this.saving.set(false);
        this.error.set(response.error?.detail || 'Could not create delivery partner.');
      },
    });
  }

  setCred(partnerId: number, field: 'username' | 'password', value: string) {
    const current = this.credDraft[partnerId] || { username: '', password: '' };
    this.credDraft[partnerId] = { ...current, [field]: value };
  }

  saveCredentials(partner: DeliveryPartner) {
    const draft = this.credDraft[partner.id] || {
      username: partner.username || '',
      password: '',
    };
    const username = draft.username.trim();
    const password = draft.password.trim();
    if (!username && !password) {
      this.error.set('Enter a username and/or password.');
      return;
    }
    this.api.updateCredentials(partner.id, {
      username: username || null,
      password: password || null,
    }).subscribe({
      next: (updated) => {
        this.partners.update((items) =>
          items.map((item) => (item.id === partner.id ? updated : item)),
        );
        this.credDraft[partner.id] = {
          username: updated.username || '',
          password: '',
        };
        this.success.set(`Login updated for ${updated.full_name}.`);
        this.error.set('');
      },
      error: (response) => {
        this.error.set(response.error?.detail || 'Could not update login.');
      },
    });
  }

  toggleMultiOrders(partner: DeliveryPartner) {
    const next = !partner.allow_multiple_orders;
    this.multiBusyId.set(partner.id);
    this.error.set('');
    this.api.updateMultiOrders(partner.id, next).subscribe({
      next: (result) => {
        this.partners.update((items) =>
          items.map((item) =>
            item.id === partner.id
              ? { ...item, allow_multiple_orders: result.allow_multiple_orders }
              : item,
          ),
        );
        this.multiBusyId.set(null);
        this.success.set(
          result.allow_multiple_orders
            ? `${partner.full_name} can now accept multiple orders.`
            : `${partner.full_name} is back to one order at a time.`,
        );
      },
      error: (response) => {
        this.multiBusyId.set(null);
        this.error.set(
          response.error?.detail || 'Could not update multiple-order setting.',
        );
      },
    });
  }

  toggleStatus(partner: DeliveryPartner) {
    const isActive = !partner.is_active;
    const action = isActive ? 'reactivate' : 'suspend';
    if (!confirm(`${action} ${partner.full_name}?`)) return;
    this.api.updateStatus(partner.id, isActive).subscribe({
      next: () => this.partners.update((items) =>
        items.map((item) =>
          item.id === partner.id ? { ...item, is_active: isActive } : item,
        ),
      ),
    });
  }

  openDocument(partner: DeliveryPartner, purpose: DeliveryDocumentPurpose) {
    this.api.document(partner.id, purpose).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.error.set('Could not open the private document.'),
    });
  }
}
