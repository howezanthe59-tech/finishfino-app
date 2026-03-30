// contact.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ContactPayload {
  name:     string;
  email:    string;
  message:  string;
}

export interface ContactResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private apiUrl = '/api/contact';

  constructor(private http: HttpClient) {}

  sendMessage(data: ContactPayload): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(this.apiUrl, data).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.error?.error ||
      error.error?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    // Backend may include extra debugging context in development mode.
    const details = error.error?.details;
    if (details && typeof details === 'string' && details.trim() && details !== message) {
      return throwError(() => new Error(`${message} (${details})`));
    }
    return throwError(() => new Error(message));
  }
}
