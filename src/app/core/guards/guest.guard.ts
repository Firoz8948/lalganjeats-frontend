// frontend/src/app/core/guards/guest.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * For login pages: allow guests; if already logged in with the matching role,
 * send them to their dashboard.
 */
export const guestGuard = (role: string, dashboardPath: string): CanActivateFn => {
  return (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(role)) {
      const returnUrl = route.queryParamMap.get('returnUrl');
      const safe =
        returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : dashboardPath;
      router.navigateByUrl(safe);
      return false;
    }
    return true;
  };
};
