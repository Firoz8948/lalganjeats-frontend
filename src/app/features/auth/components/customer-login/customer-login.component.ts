// frontend/src/app/features/auth/components/customer-login/customer-login.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BottomNavComponent } from '../../../../shared/bottom-nav/bottom-nav.component';
import { getDefaultLandingPath } from '../../../../core/utils/client-channel';

type Step = 'phone' | 'otp' | 'name';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BottomNavComponent],
  templateUrl: './customer-login.component.html',
  styleUrl: './customer-login.component.scss'
})
export class CustomerLoginComponent {
  step      = signal<Step>('phone');
  phone     = '';
  otp       = '';
  fullName  = '';
  isNewUser = false;
  loading   = signal(false);
  error     = signal('');

  readonly ROLE = 'customer';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  navigateBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl(getDefaultLandingPath());
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
      }
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
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || getDefaultLandingPath() || user.redirect_to || '/home');
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.error?.detail || 'Invalid OTP');
      }
    });
  }

  resendOTP() {
    this.otp = '';
    this.sendOTP();
  }

  goBackToPhone() {
    this.step.set('phone');
    this.error.set('');
  }
}
