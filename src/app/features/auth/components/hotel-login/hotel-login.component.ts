import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

type Step = 'phone' | 'otp';

@Component({
  selector: 'app-hotel-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './hotel-login.component.html',
  styleUrl: '../customer-login/customer-login.component.scss',
})
export class HotelLoginComponent {
  step = signal<Step>('phone');
  phone = '';
  otp = '';
  loading = signal(false);
  error = signal('');

  readonly ROLE = 'restaurant_owner';

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.hasRole('restaurant_owner')) {
      this.router.navigate(['/hotel-portal']);
    }
  }

  sendOTP() {
    if (this.phone.length !== 10) {
      this.error.set('Enter a valid 10-digit mobile number');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.sendOTP(this.phone, this.ROLE).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('otp');
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.detail || 'Failed to send OTP');
      },
    });
  }

  verifyOTP() {
    if (this.otp.length !== 6) {
      this.error.set('Enter the 6-digit OTP');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.verifyOTP(this.phone, this.otp, this.ROLE).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.router.navigate([user.redirect_to]);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.detail || 'Invalid OTP');
      },
    });
  }

  resendOTP() {
    this.otp = '';
    this.sendOTP();
  }

  goBack() {
    this.step.set('phone');
    this.error.set('');
  }
}
