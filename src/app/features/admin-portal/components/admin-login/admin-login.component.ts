// features/admin-portal/components/admin-login/admin-login.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.component.html',
  styleUrl:    './admin-login.component.scss'
})
export class AdminLoginComponent {
  username = '';
  password = '';
  loading  = signal(false);
  error    = signal('');
  showPwd  = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  private afterLoginPath(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/admin')) return returnUrl;
    return '/admin/dashboard';
  }

  togglePassword() {
    this.showPwd.update(v => !v);
  }

  private readError(err: unknown): string {
    const body = (err as { error?: { detail?: unknown } })?.error;
    const detail = body?.detail;

    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map(item => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : ''))
        .filter(Boolean);
      if (messages.length) return messages.join('. ');
    }
    const status = (err as { status?: number })?.status;
    if (status === 0 || status === 500) {
      return 'Server error — ensure the backend is running on port 8000 (only one instance).';
    }
    return 'Invalid credentials';
  }

  login() {
    if (!this.username || !this.password) {
      this.error.set('Please enter username and password');
      return;
    }
    this.error.set('');
    this.loading.set(true);

    this.auth.adminLogin(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.afterLoginPath());
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(this.readError(e));
      }
    });
  }
}
