import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  functional: false
};

const STORAGE_KEY = 'finishfino_cookie_consent';

@Injectable({
  providedIn: 'root'
})
export class CookieService {
  private preferencesSubject = new BehaviorSubject<CookiePreferences | null>(this.getStoredPreferences());
  preferences$ = this.preferencesSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    // If user is already logged in at startup, sync
    if (this.authService.getToken()) {
      this.syncWithBackend();
    }

    // React to new logins
    this.authService.loggedIn$.subscribe(() => {
      this.syncWithBackend();
    });
  }

  getStoredPreferences(): CookiePreferences | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  setConsent(prefs: CookiePreferences) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    this.preferencesSubject.next(prefs);
    
    if (this.authService.getToken()) {
      this.http.post('/api/cookie-consent', { preferences: prefs }, {
        headers: { 'x-auth-token': this.authService.getToken() || '' }
      })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    this.applyPreferences(prefs);
  }

  hasConsented(): boolean {
    return this.preferencesSubject.value !== null;
  }

  acceptAll() {
    const allOn: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    this.setConsent(allOn);
  }

  rejectNonEssential() {
    this.setConsent(DEFAULT_PREFERENCES);
  }

  private applyPreferences(prefs: CookiePreferences) {
    if (prefs.analytics) this.loadAnalytics();
    if (prefs.marketing) this.loadMarketing();
    // Functional might trigger other UI features
  }

  private loadAnalytics() {
    console.log('[CookieService] Loading Analytics scripts...');
    // Real implementation: inject GA/GTM script
  }

  private loadMarketing() {
    console.log('[CookieService] Loading Marketing scripts...');
    // Real implementation: inject FB Pixel / Ads script
  }

  syncWithBackend() {
    const token = this.authService.getToken();
    if (!token) return;

    this.http.get<{ preferences: CookiePreferences | null }>('/api/cookie-consent', {
      headers: { 'x-auth-token': token }
    })
      .pipe(
        tap(res => {
          if (res && res.preferences) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.preferences));
            this.preferencesSubject.next(res.preferences);
            this.applyPreferences(res.preferences);
          }
        }),
        catchError((err) => {
          if (err.status === 401) {
            console.warn('[CookieService] Session expired or invalid, skipping sync.');
            // Optionally: this.authService.clearToken();
          }
          return of(null);
        })
      ).subscribe();
  }
}
