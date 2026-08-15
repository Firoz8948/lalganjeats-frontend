import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HomeBannerSlide {
  id?: number;
  slide_number: number;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  private readonly baseUrl = `${environment.apiBaseUrl}/banners`;

  constructor(private http: HttpClient) {}

  getHomeBanners(): Observable<HomeBannerSlide[]> {
    return this.http.get<HomeBannerSlide[]>(this.baseUrl);
  }
}
