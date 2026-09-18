// frontend/src/app/core/interceptors/jwt.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { getDeviceId } from '../utils/device-id';

function isAuthRequest(url: string): boolean {
  return /\/auth\/(send-otp|verify-otp|partner-login|admin-login|superadmin-login)\b/.test(
    url,
  );
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const deviceId = getDeviceId();
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  if (Object.keys(headers).length) {
    req = req.clone({ setHeaders: headers });
  }

  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        !!token &&
        !isAuthRequest(req.url)
      ) {
        auth.handleSessionExpired();
      }
      return throwError(() => err);
    }),
  );
};
