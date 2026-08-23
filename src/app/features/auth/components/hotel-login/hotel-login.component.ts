import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PartnerContactDialogComponent } from '../partner-contact-dialog/partner-contact-dialog.component';

type Mode = 'password' | 'otp';
type Step = 'phone' | 'otp';

@Component({
  selector: 'app-hotel-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PartnerContactDialogComponent],
  templateUrl: './hotel-login.component.html',
  styleUrl: '../customer-login/customer-login.component.scss',
})
export class HotelLoginComponent {
  mode = signal<Mode>('password');
  step = signal<Step>('phone');
  username = '';
  password = '';
  phone = '';
  otp = '';
  acceptedLegal = false;
  loading = signal(false);
  error = signal('');
  contactDialogOpen = signal(false);

  readonly ROLE = 'restaurant_owner' as const;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.hasRole('restaurant_owner')) {
      this.router.navigate(['/hotel-portal']);
      return;
    }
    this.username = this.auth.loadPartnerUsername(this.ROLE);
  }

  usePassword() {
    this.mode.set('password');
    this.error.set('');
  }

  useOtp() {
    this.mode.set('otp');
    this.step.set('phone');
    this.error.set('');
  }

  loginWithPassword() {
    if (!this.username.trim() || !this.password) {
      this.error.set('Enter username and password');
      return;
    }
    if (!this.acceptedLegal) {
      this.error.set('Accept the partner Terms, Privacy Policy and Refund Policy to continue');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.partnerLogin(
      this.username.trim(),
      this.password,
      this.ROLE,
      this.acceptedLegal,
    ).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.auth.rememberPartnerUsername(this.ROLE, this.username);
        this.router.navigate([user.redirect_to]);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.detail || 'Invalid username or password');
      },
    });
  }

  sendOTP() {
    if (this.phone.length !== 10) {
      this.error.set('Enter a valid 10-digit owner mobile number');
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
        if (this.isUnregisteredPartnerError(e)) {
          this.contactDialogOpen.set(true);
          this.error.set('');
          return;
        }
        this.error.set(e.error?.detail || 'Failed to send OTP');
      },
    });
  }

  verifyOTP() {
    if (this.otp.length !== 6) {
      this.error.set('Enter the 6-digit OTP');
      return;
    }
    if (!this.acceptedLegal) {
      this.error.set('Accept the partner Terms, Privacy Policy and Refund Policy to continue');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.verifyOTP(
      this.phone,
      this.otp,
      this.ROLE,
      this.acceptedLegal,
    ).subscribe({
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

  private isUnregisteredPartnerError(error: any): boolean {
    const detail = String(error.error?.detail || '').toLowerCase();
    return error.status === 403 && detail.includes('not registered on this number');
  }
}
