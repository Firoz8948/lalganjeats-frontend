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
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { GeocodingService, GeocodeResult } from '../../../../core/services/geocoding.service';
import { UserSidebarService } from '../../../../core/services/user-sidebar.service';
import { UserSidebarComponent } from '../../../../shared/user-sidebar/user-sidebar.component';
import { BottomNavComponent } from '../../../../shared/bottom-nav/bottom-nav.component';

const DEFAULT_CENTER: [number, number] = [25.9, 81.95];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UserSidebarComponent, BottomNavComponent],
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
  searchTerm = '';
  searching = signal(false);
  searchResults = signal<GeocodeResult[]>([]);
  draftLabel = signal('');
  draftLat = signal<number | null>(null);
  draftLng = signal<number | null>(null);

  auth = inject(AuthService);
  cartService = inject(CartService);
  customerLocation = inject(CustomerLocationService);
  private geocoding = inject(GeocodingService);
  router = inject(Router);
  sidebar = inject(UserSidebarService);
  private ngZone = inject(NgZone);

  private map?: any;
  private marker?: any;
  private leaflet?: any;
  private searchInput$ = new Subject<string>();
  private draftSource: 'gps' | 'map' | 'manual' = 'map';

  ngOnInit() {
    if (this.auth.isLoggedIn() && this.auth.isCustomer()) {
      this.auth.loadCustomerDisplayInfo();
    }

    this.searchInput$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          this.searching.set(term.trim().length >= 3);
          return this.geocoding.search(term);
        }),
      )
      .subscribe((results) => {
        this.searching.set(false);
        this.searchResults.set(results);
      });
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
    this.searchTerm = '';
    this.searchResults.set([]);

    const existing = this.customerLocation.location();
    this.draftLat.set(existing?.lat ?? null);
    this.draftLng.set(existing?.lng ?? null);
    this.draftLabel.set(existing?.label ?? '');

    this.isLocationModalOpen.set(true);
    setTimeout(() => this.initLocationMap(), 60);
  }

  closeLocationModal() {
    this.isLocationModalOpen.set(false);
    this.mapReady.set(false);
    this.map?.remove?.();
    this.map = undefined;
    this.marker = undefined;
  }

  onSearchInput(value: string) {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  chooseSearchResult(result: GeocodeResult) {
    this.searchResults.set([]);
    this.searchTerm = result.label;
    this.draftSource = 'manual';
    this.setDraft(result.lat, result.lng, result.label);
    this.placeDraftMarker(result.lat, result.lng, 15);
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
        this.ngZone.run(() => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.draftSource = 'gps';
          this.setDraft(lat, lng, '');
          this.placeDraftMarker(lat, lng, 16);
          this.resolveLabel(lat, lng, 'Current location');
          this.locationBusy.set(false);
        });
      },
      () => {
        this.ngZone.run(() => {
          this.locationBusy.set(false);
          this.locationError.set(
            'Could not get your exact location. Allow location access, search, or pick on the map.',
          );
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  confirmLocation() {
    const lat = this.draftLat();
    const lng = this.draftLng();
    if (lat == null || lng == null) {
      this.locationError.set('Search a place, use current location, or tap the map first.');
      return;
    }
    this.customerLocation.setLocation({
      lat,
      lng,
      label: this.shortLabel(this.draftLabel()) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      source: this.draftSource,
    });
    this.closeLocationModal();
  }

  /** Nominatim returns full postal addresses; the navbar chip only needs the locality. */
  private shortLabel(full: string): string {
    const parts = full
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && !/^\d{6}$/.test(p) && p.toLowerCase() !== 'india');
    return parts.slice(0, 2).join(', ');
  }

  private setDraft(lat: number, lng: number, label: string) {
    this.draftLat.set(lat);
    this.draftLng.set(lng);
    this.draftLabel.set(label);
    this.locationError.set('');
  }

  private resolveLabel(lat: number, lng: number, fallback: string) {
    this.geocoding.reverse(lat, lng).subscribe((label) => {
      this.draftLabel.set(label || fallback);
    });
  }

  private async initLocationMap() {
    const el = this.locationMapRef?.nativeElement;
    if (!el) return;

    try {
      const mod: any = await import('leaflet');
      const L = this.leaflet ?? mod.default ?? mod;
      this.leaflet = L;

      const existingLat = this.draftLat();
      const existingLng = this.draftLng();
      const center: [number, number] =
        existingLat != null && existingLng != null ? [existingLat, existingLng] : DEFAULT_CENTER;

      this.map = L.map(el, { attributionControl: true }).setView(center, existingLat != null ? 15 : 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this.map);

      this.map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        this.ngZone.run(() => {
          this.draftSource = 'map';
          this.setDraft(lat, lng, '');
          this.resolveLabel(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        });
        this.placeDraftMarker(lat, lng);
      });

      if (existingLat != null && existingLng != null) {
        this.placeDraftMarker(existingLat, existingLng);
      }

      setTimeout(() => this.map?.invalidateSize(), 100);
      this.mapReady.set(true);
    } catch {
      this.locationError.set('Map could not load. Search a place or use current location.');
    }
  }

  private placeDraftMarker(lat: number, lng: number, zoom?: number) {
    const L = this.leaflet;
    if (!this.map || !L) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: 'le-pin',
          html: '<span class="le-pin__dot"></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const p = this.marker.getLatLng();
        this.ngZone.run(() => {
          this.draftSource = 'map';
          this.setDraft(p.lat, p.lng, '');
          this.resolveLabel(p.lat, p.lng, `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`);
        });
      });
    }

    this.map.setView([lat, lng], zoom ?? this.map.getZoom());
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
