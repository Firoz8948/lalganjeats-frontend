import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * OpenStreetMap Nominatim geocoding. Keyless, so search and reverse lookup keep
 * working even when no Google Maps key is configured.
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);
  private readonly base = 'https://nominatim.openstreetmap.org';

  search(query: string): Observable<GeocodeResult[]> {
    const q = query.trim();
    if (q.length < 3) return of([]);

    const params = new HttpParams()
      .set('q', q)
      .set('format', 'json')
      .set('addressdetails', '1')
      .set('countrycodes', 'in')
      .set('limit', '6');

    return this.http.get<NominatimPlace[]>(`${this.base}/search`, { params }).pipe(
      map((places) =>
        places.map((p) => ({
          label: p.display_name,
          lat: Number(p.lat),
          lng: Number(p.lon),
        })),
      ),
      catchError(() => of([])),
    );
  }

  reverse(lat: number, lng: number): Observable<string | null> {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lon', String(lng))
      .set('format', 'json')
      .set('zoom', '18');

    return this.http.get<NominatimPlace>(`${this.base}/reverse`, { params }).pipe(
      map((place) => place?.display_name ?? null),
      catchError(() => of(null)),
    );
  }
}
