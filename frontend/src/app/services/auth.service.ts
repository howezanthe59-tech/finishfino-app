import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CustomerProfile } from './profile.service';

interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    profileImageUrl?: string;
    role: string;
  };
  token?: string;
}

interface ApiMessageResponse {
  message: string;
}

const TOKEN_KEY = 'finishfino_token';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = '/api/auth';
  private sessionToken: string | null = null;
  private loggedInSubject = new Subject<void>();
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // Remove legacy persistent token storage (migrate to HttpOnly cookie session).
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }

  signup(data: { fullName: string; email: string; password: string; phone?: string; address?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, data, { withCredentials: true }).pipe(
      tap((res) => {
        this.storeToken(res.token || '');
        this.loggedInSubject.next();
      })
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, data, { withCredentials: true }).pipe(
      tap((res) => {
        this.storeToken(res.token || '');
        this.loggedInSubject.next();
      })
    );
  }

  forgotPassword(data: { email: string }): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/forgot-password`, data, { withCredentials: true });
  }

  resetPassword(data: { token: string; new_password: string }): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/reset-password`, data, { withCredentials: true });
  }

  me(): Observable<{ user: CustomerProfile }> {
    return this.http.get<{ user: CustomerProfile }>(`${this.baseUrl}/me`, { withCredentials: true });
  }

  getToken(): string | null {
    if (this.sessionToken) return this.sessionToken;
    try {
      // Profile is persisted locally; use it as a non-sensitive session hint for legacy call sites.
      return localStorage.getItem('finishfino_profile') ? 'cookie-session' : null;
    } catch {
      return null;
    }
  }

  clearToken(): void {
    this.sessionToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors.
    }
    // Best-effort server-side session cookie clear.
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      error: () => {}
    });
  }

  private storeToken(token: string) {
    this.sessionToken = token || null;
  }
}
