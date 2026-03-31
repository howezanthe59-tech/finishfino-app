import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const shouldIncludeCredentials =
      request.url.startsWith('/api/') ||
      request.url.startsWith('/auth/') ||
      request.url.includes('/api/');

    const authReadyRequest = shouldIncludeCredentials && !request.withCredentials
      ? request.clone({ withCredentials: true })
      : request;

    return next.handle(authReadyRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        const url = authReadyRequest.url || '';
        const isAuthEndpoint = /\/api\/auth\/(login|signup|forgot-password|reset-password)\b/.test(url) || /\/auth\/(login|signup|forgot-password|reset-password)\b/.test(url);

        // Global Error Handling Logic
        if ([401, 403].includes(error.status) && !isAuthEndpoint) {
          // Auto logout if 401 Unauthorized or 403 Forbidden response returned from api
          console.error('Critical Auth Error:', error.status);
          // Potential logic: this.authService.logout();
        }

        const errorMessage = error.error?.error || error.error?.message || error.statusText || 'Unknown Server Error';
        console.error(`[HTTP Error Interceptor] ${error.status}: ${errorMessage}`);
        
        // Return error as an observable
        return throwError(() => error);
      })
    );
  }
}
