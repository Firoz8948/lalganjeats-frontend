// frontend/src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // Fetch lazy route chunks in the background so page-to-page taps are
      // instant instead of waiting on a network round trip.
      withPreloading(PreloadAllModules),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withInterceptors([jwtInterceptor]))
  ]
};
