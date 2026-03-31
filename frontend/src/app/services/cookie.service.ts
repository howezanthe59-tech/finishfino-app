import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
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
    // Try sync at startup; if unauthenticated, backend returns 401 and we ignore.
    this.syncWithBackend();

    // React to new logins
    this.authService.loggedIn$.subscribe(() => {
      this.syncWithBackend();
    });
  }

  getStoredPreferences(): CookiePreferences | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      return this.normalizePreferences(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  setConsent(prefs: CookiePreferences) {
    const normalized = this.normalizePreferences(prefs);
    if (!normalized) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    this.preferencesSubject.next(normalized);
    
    this.http.post('/api/cookie-consent', { preferences: normalized })
      .pipe(catchError(() => of(null)))
      .subscribe();

    this.applyPreferences(normalized);
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
    this.http.get<{ preferences: CookiePreferences | null }>('/api/cookie-consent')
      .pipe(
        tap(res => {
          const normalized = this.normalizePreferences(res?.preferences);
          if (normalized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            this.preferencesSubject.next(normalized);
            this.applyPreferences(normalized);
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

  private normalizePreferences(raw: unknown): CookiePreferences | null {
    let parsed: unknown = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return null;
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const prefs = parsed as Partial<CookiePreferences>;

    return {
      essential: true,
      analytics: !!prefs.analytics,
      marketing: !!prefs.marketing,
      functional: !!prefs.functional
    };
  }
}
