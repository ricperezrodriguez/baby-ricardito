import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { AppUpdateService } from '@app/core/app-update.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';
import { httpErrorSnackbarInterceptor } from '@app/core/http-error-snackbar.interceptor';
import { mockBackendInterceptor } from '@app/core/mocks/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => void inject(AppUpdateService)),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorSnackbarInterceptor, mockBackendInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
