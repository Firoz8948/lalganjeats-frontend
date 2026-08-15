/// <reference types="google.maps" />
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
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { UserSidebarService } from '../../../../core/services/user-sidebar.service';
import { UserSidebarComponent } from '../../../../shared/user-sidebar/user-sidebar.component';
import { BottomNavComponent } from '../../../../shared/bottom-nav/bottom-nav.component';
import { GoogleMapsLoaderService } from '../../../tracking/services/google-maps-loader.service';
import { TrackingService } from '../../../tracking/services/tracking.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, UserSidebarComponent, BottomNavComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements AfterViewInit, OnInit {
  @ViewChild('mobileHeader') mobileHeaderRef!: ElementRef<HTMLElement>;
  @ViewChild('locationMap') locationMapRef?: ElementRef<HTMLDivElement>;

  isScrolled = signal(false);
  isProfileDropdownOpen = signal(false);
  isLocationModalOpen = signal(false);
  locationBusy = signal(false);
  locationError = signal('');
  mapReady = signal(false);

  auth = inject(AuthService);
  cartService = inject(CartService);
  customerLocation = inject(CustomerLocationService);
  router = inject(Router);
  sidebar = inject(UserSidebarService);
  private mapsLoader = inject(GoogleMapsLoaderService);
  private tracking = inject(TrackingService);
  private ngZone = inject(NgZone);

  private map?: google.maps.Map;
  private marker?: google.maps.Marker;
  private draftLat: number | null = null;
  private draftLng: number | null = null;

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
      const h = this.mobileHeaderRef.nativeElement.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--mobile-header-height', `${h}px`);
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 10);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateMobileHeaderHeight();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.profile-trigger') && !target.closest('.profile-dropdown')) {
      this.isProfileDropdownOpen.set(false);
    }
  }

  toggleProfileDropdown() {
    if (!this.auth.isLoggedIn() || !this.auth.isCustomer()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.isProfileDropdownOpen.update((v) => !v);
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

  openLocationModal() {
    this.locationError.set('');
    this.isLocationModalOpen.set(true);
    setTimeout(() => this.initLocationMap(), 50);
  }

  closeLocationModal() {
    this.isLocationModalOpen.set(false);
    this.mapReady.set(false);
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported on this device.');
      return;
    }
    this.locationBusy.set(true);
    this.locationError.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.draftLat = lat;
        this.draftLng = lng;
        this.placeDraftMarker(lat, lng);
        this.reverseGeocodeAndSave(lat, lng, 'gps');
      },
      () => {
        this.locationBusy.set(false);
        this.locationError.set('Could not get your exact location. Allow location access or pick on the map.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  confirmMapLocation() {
    if (this.draftLat == null || this.draftLng == null) {
      this.locationError.set('Tap the map to place your marker first.');
      return;
    }
    this.reverseGeocodeAndSave(this.draftLat, this.draftLng, 'map');
  }

  private initLocationMap() {
    const el = this.locationMapRef?.nativeElement;
    if (!el) return;

    this.tracking.publicConfig().subscribe({
      next: async (cfg) => {
        const key = cfg.google_maps_api_key || '';
        if (!key) {
          this.locationError.set('Map is unavailable. Use current location instead.');
          return;
        }
        try {
          const googleApi = await this.mapsLoader.load(key);
          const existing = this.customerLocation.location();
          const center = {
            lat: existing?.lat ?? 26.14,
            lng: existing?.lng ?? 80.9,
          };
          this.draftLat = existing?.lat ?? null;
          this.draftLng = existing?.lng ?? null;

          this.map = new googleApi.maps.Map(el, {
            center,
            zoom: existing ? 15 : 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            this.ngZone.run(() => {
              this.draftLat = lat;
              this.draftLng = lng;
              this.locationError.set('');
            });
            this.placeDraftMarker(lat, lng);
          });

          if (existing) {
            this.placeDraftMarker(existing.lat, existing.lng);
          }
          this.mapReady.set(true);
        } catch {
          this.locationError.set('Could not load map. Use current location instead.');
        }
      },
      error: () => {
        this.locationError.set('Could not load map config. Use current location instead.');
      },
    });
  }

  private placeDraftMarker(lat: number, lng: number) {
    if (!this.map || !window.google?.maps) return;
    const position = { lat, lng };
    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      this.marker = new google.maps.Marker({
        map: this.map,
        position,
        draggable: true,
      });
      this.marker.addListener('dragend', () => {
        const p = this.marker?.getPosition();
        if (!p) return;
        this.ngZone.run(() => {
          this.draftLat = p.lat();
          this.draftLng = p.lng();
        });
      });
    }
    this.map.panTo(position);
  }

  private reverseGeocodeAndSave(
    lat: number,
    lng: number,
    source: 'gps' | 'map' | 'manual'
  ) {
    this.locationBusy.set(true);
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const finish = (label: string) => {
      this.customerLocation.setLocation({ lat, lng, label, source });
      this.locationBusy.set(false);
      this.closeLocationModal();
    };

    if (!window.google?.maps) {
      finish(source === 'gps' ? 'Current Location' : fallback);
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      this.ngZone.run(() => {
        if (status === 'OK' && results?.[0]?.formatted_address) {
          finish(results[0].formatted_address);
        } else {
          finish(source === 'gps' ? 'Current Location' : fallback);
        }
      });
    });
  }

  get user() {
    return this.auth.currentUser();
  }
  get displayGreeting() {
    return this.auth.displayGreeting();
  }
  get avatarInitial() {
    return this.auth.avatarInitial();
  }
  get isCustomer() {
    return this.auth.isCustomer();
  }

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
