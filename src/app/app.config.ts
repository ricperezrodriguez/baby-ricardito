import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';
import { httpErrorSnackbarInterceptor } from '@app/core/http-error-snackbar.interceptor';
import { mockBackendInterceptor } from '@app/core/mocks/mock-backend.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpErrorSnackbarInterceptor, mockBackendInterceptor]))
  ]
};
