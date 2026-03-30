import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerProfile } from './profile.service';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private apiUrl = '/api/profile/me';

  constructor(private http: HttpClient) {}

  getMe(token: string): Observable<{ user: CustomerProfile }> {
    return this.http.get<{ user: CustomerProfile }>(this.apiUrl, {
      headers: { 'x-auth-token': token }
    });
  }

  updateMe(token: string, formData: FormData): Observable<{ user: CustomerProfile }> {
    return this.http.put<{ user: CustomerProfile }>(this.apiUrl, formData, {
      headers: { 'x-auth-token': token }
    });
  }
}

