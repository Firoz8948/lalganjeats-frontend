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
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  from,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { CustomerLocationService } from '../../../../core/services/customer-location.service';
import { UserSidebarService } from '../../../../core/services/user-sidebar.service';
import { UserSidebarComponent } from '../../../../shared/user-sidebar/user-sidebar.component';
import { BottomNavComponent } from '../../../../shared/bottom-nav/bottom-nav.component';
import {
  GoogleMapsApi,
  GoogleMapsLoaderService,
} from '../../../tracking/services/google-maps-loader.service';
import { TrackingService } from '../../../tracking/services/tracking.service';

const DEFAULT_CENTER = { lat: 26.1635, lng: 80.9345 };
const MIN_SEARCH_CHARS = 2;
/** Ranks nearby matches first without hiding far-away ones. */
const SEARCH_BIAS_RADIUS_M = 60000;

export interface LocationSuggestion {
  label: string;
  primary?: string;
  secondary?: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UserSidebarComponent, BottomNavComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements AfterViewInit, OnInit, OnDestroy {
  private static instanceCount = 0;
  @ViewChild('mobileHeader') mobileHeaderRef!: ElementRef<HTMLElement>;
  @ViewChild('locationMap') locationMapRef?: ElementRef<HTMLDivElement>;

  isScrolled = signal(false);
  isMobileSearchHidden = signal(false);
  isProfileDropdownOpen = signal(false);
  isLocationModalOpen = signal(false);
  locationBusy = signal(false);
  locationError = signal('');
  mapReady = signal(false);
  searchTerm = '';
  searching = signal(false);
  searchResults = signal<LocationSuggestion[]>([]);
  draftLabel = signal('');
  draftLat = signal<number | null>(null);
  draftLng = signal<number | null>(null);

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
  private geocoder?: google.maps.Geocoder;
  private autocomplete?: google.maps.places.AutocompleteService;
  private sessionToken?: google.maps.places.AutocompleteSessionToken;
  private searchInput$ = new Subject<string>();
  private googleReady?: Promise<GoogleMapsApi>;
  private draftSource: 'gps' | 'map' | 'manual' = 'map';
  private lastScrollY = 0;

  ngOnInit() {
    NavbarComponent.instanceCount += 1;
    document.body.classList.add('has-customer-header');

    if (this.auth.isLoggedIn() && this.auth.isCustomer()) {
      this.auth.loadCustomerDisplayInfo();
    }

    this.searchInput$
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = term.trim();
          this.searching.set(q.length >= MIN_SEARCH_CHARS);
          return from(this.suggestPlaces(q));
        }),
      )
      .subscribe((results) => {
        this.ngZone.run(() => {
          this.searching.set(false);
          this.searchResults.set(results);
        });
      });
  }

  ngOnDestroy() {
    NavbarComponent.instanceCount = Math.max(0, NavbarComponent.instanceCount - 1);
    if (NavbarComponent.instanceCount === 0) {
      document.body.classList.remove('has-customer-header');
    }
  }

  ngAfterViewInit() {
    this.updateMobileHeaderHeight();
    // Wait for any in-flight auto-detection to settle so we don't flash the
    // modal when GPS is about to succeed silently.  On repeat mounts (route
    // changes) with no detection in flight this resolves immediately.
    this.customerLocation.waitForDetection().then(() => {
      if (this.customerLocation.shouldPromptAutomatically()) {
        this.customerLocation.markAutoPrompted();
        setTimeout(() => this.openLocationModal());
      }
    });
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
    const currentY = Math.max(0, window.scrollY);
    this.isScrolled.set(currentY > 10);
    if (window.innerWidth <= 768) {
      const previousHidden = this.isMobileSearchHidden();
      const delta = currentY - this.lastScrollY;
      if (currentY < 48) {
        this.isMobileSearchHidden.set(false);
      } else if (Math.abs(delta) > 5) {
        this.isMobileSearchHidden.set(delta > 0);
      }
      if (previousHidden !== this.isMobileSearchHidden()) {
        // Let the search collapse/expand animation settle, then shrink page padding.
        setTimeout(() => this.updateMobileHeaderHeight(), 200);
      }
    }
    this.lastScrollY = currentY;
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
    this.ensureGoogle().catch(() => undefined);
    setTimeout(() => this.initLocationMap(), 60);
  }

  closeLocationModal() {
    this.isLocationModalOpen.set(false);
    this.mapReady.set(false);
    this.map = undefined;
    this.marker = undefined;
  }

  onSearchInput(value: string) {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  async chooseSearchResult(suggestion: LocationSuggestion) {
    this.searchResults.set([]);
    this.searchTerm = suggestion.label;
    this.draftSource = 'manual';

    if (suggestion.lat != null && suggestion.lng != null) {
      this.setDraft(suggestion.lat, suggestion.lng, suggestion.label);
      this.placeDraftMarker(suggestion.lat, suggestion.lng, 16);
      return;
    }
    if (!suggestion.placeId || !this.geocoder) return;

    try {
      const res = await this.geocoder.geocode({ placeId: suggestion.placeId });
      const loc = res.results?.[0]?.geometry?.location;
      if (!loc) return;
      const lat = loc.lat();
      const lng = loc.lng();
      this.ngZone.run(() => {
        this.setDraft(lat, lng, res.results[0].formatted_address || suggestion.label);
      });
      this.placeDraftMarker(lat, lng, 16);
    } catch {
      this.ngZone.run(() =>
        this.locationError.set('Could not resolve that place. Pick it on the map instead.'),
      );
    }
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported on this device.');
      return;
    }
    this.locationBusy.set(true);
    this.locationError.set('');

    const applyPos = (lat: number, lng: number) => {
      this.ngZone.run(() => {
        this.draftSource = 'gps';
        this.setDraft(lat, lng, '');
        this.placeDraftMarker(lat, lng, 16);
        this.resolveLabel(lat, lng, 'Current location');
        this.locationBusy.set(false);
      });
    };

    // Fast attempt 1: High accuracy with cached tolerance & short timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPos(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Fast attempt 2: Immediate fallback to coarse cellular/wifi positioning
        navigator.geolocation.getCurrentPosition(
          (p2) => {
            applyPos(p2.coords.latitude, p2.coords.longitude);
          },
          () => {
            this.ngZone.run(() => {
              this.locationBusy.set(false);
              this.locationError.set(
                'Could not get your exact location. Allow location access, search, or pick on the map.',
              );
            });
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
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

  /** Geocoders return full postal addresses; the navbar chip only needs the locality. */
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

  private async suggestPlaces(query: string): Promise<LocationSuggestion[]> {
    if (query.length < MIN_SEARCH_CHARS) return [];
    try {
      await this.ensureGoogle();
    } catch {
      return [];
    }

    if (this.autocomplete) {
      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: 'in' },
          sessionToken: this.sessionToken,
        };
        const bias = this.searchBiasCenter();
        if (bias && window.google?.maps) {
          request.location = new google.maps.LatLng(bias.lat, bias.lng);
          request.radius = SEARCH_BIAS_RADIUS_M;
        }

        const res = await this.autocomplete.getPlacePredictions(request);
        if (res.predictions?.length) {
          return res.predictions.slice(0, 6).map((p) => ({
            label: p.description,
            placeId: p.place_id,
            primary: p.structured_formatting?.main_text || p.description,
            secondary: p.structured_formatting?.secondary_text || '',
          }));
        }
      } catch {
        /* Places API may not be enabled on the key; fall through to geocoding. */
      }
    }

    if (!this.geocoder) return [];
    try {
      const res = await this.geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'IN' },
      });
      return (res.results || []).slice(0, 6).map((r) => ({
        label: r.formatted_address,
        primary: r.address_components?.[0]?.long_name || r.formatted_address,
        secondary: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      }));
    } catch {
      return [];
    }
  }

  /** Bias suggestions towards the pin being edited, else the serviced town. */
  private searchBiasCenter(): { lat: number; lng: number } | null {
    const lat = this.draftLat();
    const lng = this.draftLng();
    if (lat != null && lng != null) return { lat, lng };
    return DEFAULT_CENTER;
  }

  private resolveLabel(lat: number, lng: number, fallback: string) {
    if (!this.geocoder) {
      this.draftLabel.set(fallback);
      return;
    }
    this.geocoder
      .geocode({ location: { lat, lng } })
      .then((res) => {
        this.ngZone.run(() =>
          this.draftLabel.set(res.results?.[0]?.formatted_address || fallback),
        );
      })
      .catch(() => this.ngZone.run(() => this.draftLabel.set(fallback)));
  }

  /**
   * Loads Maps once per modal session so search can run before (and
   * independently of) the map canvas being ready.
   */
  private ensureGoogle(): Promise<GoogleMapsApi> {
    if (!this.googleReady) {
      this.googleReady = firstValueFrom(this.tracking.publicConfig())
        .then((cfg) => {
          const key = cfg.google_maps_api_key || '';
          if (!key) throw new Error('missing-key');
          return this.mapsLoader.load(key);
        })
        .then((googleApi) => {
          this.geocoder = new googleApi.maps.Geocoder();
          if (googleApi.maps.places) {
            this.autocomplete = new googleApi.maps.places.AutocompleteService();
            this.sessionToken = new googleApi.maps.places.AutocompleteSessionToken();
          }
          return googleApi;
        });
    }
    return this.googleReady;
  }

  private async initLocationMap() {
    const el = this.locationMapRef?.nativeElement;
    if (!el) return;

    try {
      const googleApi = await this.ensureGoogle();
      {
        {
          const lat = this.draftLat();
          const lng = this.draftLng();
          const center = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;

          this.map = new googleApi.maps.Map(el, {
            center,
            zoom: lat != null ? 16 : 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
          });

          this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const clickLat = e.latLng.lat();
            const clickLng = e.latLng.lng();
            this.ngZone.run(() => {
              this.draftSource = 'map';
              this.setDraft(clickLat, clickLng, '');
              this.resolveLabel(
                clickLat,
                clickLng,
                `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`,
              );
            });
            this.placeDraftMarker(clickLat, clickLng);
          });

          if (lat != null && lng != null) {
            this.placeDraftMarker(lat, lng);
          }
          this.ngZone.run(() => this.mapReady.set(true));
        }
      }
    } catch (err) {
      const missingKey = (err as Error)?.message === 'missing-key';
      this.ngZone.run(() =>
        this.locationError.set(
          missingKey
            ? 'Map is not configured yet. Search your area or use current location.'
            : 'Could not load map. Search your area or use current location.',
        ),
      );
    }
  }

  private placeDraftMarker(lat: number, lng: number, zoom?: number) {
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
        const dragLat = p.lat();
        const dragLng = p.lng();
        this.ngZone.run(() => {
          this.draftSource = 'map';
          this.setDraft(dragLat, dragLng, '');
          this.resolveLabel(dragLat, dragLng, `${dragLat.toFixed(4)}, ${dragLng.toFixed(4)}`);
        });
      });
    }

    this.map.panTo(position);
    if (zoom) this.map.setZoom(zoom);
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
