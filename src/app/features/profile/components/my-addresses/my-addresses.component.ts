import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, Address } from '../../services/profile.service';

@Component({
  selector: 'app-my-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-addresses.component.html',
  styleUrl: './my-addresses.component.scss'
})
export class MyAddressesComponent implements OnInit {
  addresses = signal<Address[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  error     = signal('');
  success   = signal('');
  showForm  = signal(false);

  form = {
    label:        'Home',
    full_address: '',
    landmark:     '',
    city:         'Lalganj',
    pincode:      '',
    is_default:   false
  };

  constructor(private profileService: ProfileService) {}

  ngOnInit() { this.loadAddresses(); }

  loadAddresses() {
    this.loading.set(true);
    this.profileService.getAddresses().subscribe({
      next: (data) => {
        this.addresses.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openForm() {
    this.showForm.set(true);
    this.error.set('');
    this.success.set('');
  }

  cancelForm() {
    this.showForm.set(false);
    this.form = {
      label: 'Home',
      full_address: '',
      landmark: '',
      city: 'Lalganj',
      pincode: '',
      is_default: false
    };
  }

  saveAddress() {
    if (!this.form.full_address.trim()) {
      this.error.set('Please enter a full address');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    this.profileService.addAddress(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.success.set('Address saved successfully');
        this.cancelForm();
        this.loadAddresses();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e.error?.detail || 'Failed to save address');
      }
    });
  }

  setDefault(id: number) {
    this.profileService.setDefaultAddress(id).subscribe({
      next: () => this.loadAddresses()
    });
  }

  deleteAddress(id: number) {
    this.profileService.deleteAddress(id).subscribe({
      next: () => this.loadAddresses()
    });
  }
}
