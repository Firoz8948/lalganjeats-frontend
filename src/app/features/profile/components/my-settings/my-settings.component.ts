import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, CustomerSettings } from '../../services/profile.service';

@Component({
  selector: 'app-my-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-settings.component.html',
  styleUrl: './my-settings.component.scss'
})
export class MySettingsComponent implements OnInit {
  settings = signal<CustomerSettings | null>(null);
  loading  = signal(true);
  saving   = signal(false);
  success  = signal('');
  error    = signal('');

  form: CustomerSettings = {
    notif_order_updates: true,
    notif_offers:        true,
    notif_sms:           false,
    preferred_language:  'en',
    preferred_payment:   'cod'
  };

  constructor(private profileService: ProfileService) {}

  ngOnInit() { this.loadSettings(); }

  loadSettings() {
    this.loading.set(true);
    this.profileService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.form = { ...data };
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.error.set('');

    this.profileService.updateSettings(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Settings saved successfully');
        this.loadSettings();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e.error?.detail || 'Failed to save settings');
      }
    });
  }
}
