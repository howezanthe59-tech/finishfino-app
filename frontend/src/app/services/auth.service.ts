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
  token: string;
}

const TOKEN_KEY = 'finishfino_token';

import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = '/api/auth';
  private loggedInSubject = new Subject<void>();
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(private http: HttpClient) {}

  signup(data: { fullName: string; email: string; password: string; phone?: string; address?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/signup`, data).pipe(
      tap((res) => {
        this.storeToken(res.token);
        this.loggedInSubject.next();
      })
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, data).pipe(
      tap((res) => {
        this.storeToken(res.token);
        this.loggedInSubject.next();
      })
    );
  }

  me(): Observable<{ user: CustomerProfile }> {
    return this.http.get<{ user: CustomerProfile }>(`${this.baseUrl}/me`, {
      headers: { 'x-auth-token': this.getToken() || '' }
    });
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private storeToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}
