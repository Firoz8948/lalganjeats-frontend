// frontend/src/app/shared/user-sidebar/user-sidebar.component.ts
import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserSidebarService } from '../../core/services/user-sidebar.service';
import { ProfileService } from '../../features/profile/services/profile.service';

@Component({
  selector: 'app-user-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-sidebar.component.html',
  styleUrl: './user-sidebar.component.scss',
})
export class UserSidebarComponent implements OnDestroy {
  auth = inject(AuthService);
  sidebar = inject(UserSidebarService);
  private profileApi = inject(ProfileService);
  private router = inject(Router);

  email = signal<string | null>(null);
  private closing = signal(false);

  constructor() {
    effect(() => {
      if (this.sidebar.isOpen() && this.auth.isLoggedIn() && this.auth.isCustomer()) {
        this.loadProfile();
      }
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  private loadProfile() {
    this.profileApi.getProfile().subscribe({
      next: (p) => this.email.set(p.email || null),
      error: () => this.email.set(null),
    });
  }

  get displayName(): string {
    const name = this.auth.currentUser()?.full_name?.trim() ?? '';
    if (name && !/^User_?\d+$/i.test(name.replace(/\s/g, ''))) return name;
    return this.auth.displayGreeting();
  }

  get avatarInitial(): string {
    return this.auth.avatarInitial();
  }

  close() {
    if (this.closing()) return;
    this.closing.set(true);
    // Allow exit animation then remove from DOM via service
    setTimeout(() => {
      this.sidebar.close();
      this.closing.set(false);
    }, 280);
  }

  onNav(path: string) {
    this.close();
    this.router.navigateByUrl(path);
  }

  logout() {
    this.close();
    setTimeout(() => this.auth.logout(), 100);
  }

  get isClosing() {
    return this.closing();
  }
}
