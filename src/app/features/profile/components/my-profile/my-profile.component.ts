// features/profile/components/my-profile/my-profile.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService, CustomerProfile } from '../../services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.component.html',
  styleUrl:    './my-profile.component.scss'
})
export class MyProfileComponent implements OnInit {
  profile  = signal<CustomerProfile | null>(null);
  editing  = signal(false);
  saving   = signal(false);
  success  = signal('');
  error    = signal('');

  // Edit form model
  form = {
    full_name:     '',
    email:         '',
    gender:        '',
    date_of_birth: ''
  };

  constructor(
    private profileService: ProfileService,
    private auth: AuthService
  ) {}

  ngOnInit() { this.loadProfile(); }

  loadProfile() {
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.auth.patchUser({ full_name: data.full_name, phone: data.phone });
        // Pre-fill form
        this.form = {
          full_name:     data.full_name     || '',
          email:         data.email         || '',
          gender:        data.gender         || '',
          date_of_birth: data.date_of_birth || ''
        };
      }
    });
  }

  startEditing() {
    this.editing.set(true);
    this.success.set('');
    this.error.set('');
  }

  cancelEditing() {
    this.editing.set(false);
    // Reset form to current profile data
    const p = this.profile();
    if (p) {
      this.form = {
        full_name:     p.full_name     || '',
        email:         p.email         || '',
        gender:        p.gender         || '',
        date_of_birth: p.date_of_birth || ''
      };
    }
  }

  saveProfile() {
    this.saving.set(true);
    this.error.set('');

    this.profileService.updateProfile(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.success.set('Profile updated successfully!');
        this.auth.patchUser({ full_name: this.form.full_name });
        this.loadProfile();
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e.error?.detail || 'Failed to update profile');
      }
    });
  }
}
