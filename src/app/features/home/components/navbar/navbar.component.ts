// frontend/src/app/features/home/components/navbar/navbar.component.ts
import {
  Component,
  HostListener,
  signal,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  inject,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { UserSidebarService } from '../../../../core/services/user-sidebar.service';
import { UserSidebarComponent } from '../../../../shared/user-sidebar/user-sidebar.component';
import { BottomNavComponent } from '../../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, UserSidebarComponent, BottomNavComponent],
  templateUrl: './navbar.component.html',
  styleUrl:    './navbar.component.scss'
})
export class NavbarComponent implements AfterViewInit, OnInit {

  @ViewChild('mobileHeader') mobileHeaderRef!: ElementRef<HTMLElement>;

  // ── UI state ──────────────────────────────────────────
  isScrolled          = signal(false);
  isProfileDropdownOpen = signal(false);  // Desktop dropdown
  isLocationModalOpen   = signal(false);
  currentLocation       = signal('Lalganj, UP');

  auth        = inject(AuthService);
  cartService = inject(CartService);
  router      = inject(Router);
  sidebar     = inject(UserSidebarService);

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    if (this.auth.isLoggedIn() && this.auth.isCustomer()) {
      this.auth.loadCustomerDisplayInfo();
    }
  }

  ngAfterViewInit() {
    this.updateMobileHeaderHeight();
    this.ngZone.runOutsideAngular(() => {
      const ro = new ResizeObserver(() => {
        this.ngZone.run(() => this.updateMobileHeaderHeight());
      });
      if (this.mobileHeaderRef?.nativeElement) {
        ro.observe(this.mobileHeaderRef.nativeElement);
      }
    });
  }

  private updateMobileHeaderHeight() {
    if (window.innerWidth <= 768 && this.mobileHeaderRef?.nativeElement) {
      const h = this.mobileHeaderRef.nativeElement
                    .getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        '--mobile-header-height', `${h}px`
      );
    }
  }

  @HostListener('window:scroll')
  onScroll() { this.isScrolled.set(window.scrollY > 10); }

  @HostListener('window:resize')
  onResize() { this.updateMobileHeaderHeight(); }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.profile-trigger') &&
        !target.closest('.profile-dropdown')) {
      this.isProfileDropdownOpen.set(false);
    }
  }

  // ── Profile ───────────────────────────────────────────
  toggleProfileDropdown() {
    if (!this.auth.isLoggedIn() || !this.auth.isCustomer()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.isProfileDropdownOpen.update(v => !v);
  }

  openUserSidebar() {
    this.isProfileDropdownOpen.set(false);
    this.sidebar.open();
  }

  logout() {
    this.auth.logout();
    this.isProfileDropdownOpen.set(false);
    this.sidebar.close();
  }

  // ── Location ──────────────────────────────────────────
  openLocationModal()  { this.isLocationModalOpen.set(true);  }
  closeLocationModal() { this.isLocationModalOpen.set(false); }

  useCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.currentLocation.set('Current Location');
          this.closeLocationModal();
        },
        () => alert('Could not get location.')
      );
    }
  }

  setManualLocation(input: HTMLInputElement) {
    if (input.value.trim()) {
      this.currentLocation.set(input.value.trim());
      this.closeLocationModal();
    }
  }

  // ── Helpers ───────────────────────────────────────────
  get user()           { return this.auth.currentUser(); }
  get displayGreeting(){ return this.auth.displayGreeting(); }
  get avatarInitial()  { return this.auth.avatarInitial(); }
  get isCustomer()     { return this.auth.isCustomer(); }

  get displayPhone(): string {
    const phone = this.user?.phone?.replace(/\D/g, '') ?? '';
    if (phone.length === 10) return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    if (phone.length > 0) return `+91 ${phone}`;
    return '';
  }

  get dropdownTitle(): string {
    const name = this.user?.full_name?.trim() ?? '';
    if (name && !/^User_?\d+$/i.test(name.replace(/\s/g, ''))) {
      return name;
    }
    return this.displayGreeting;
  }
}
