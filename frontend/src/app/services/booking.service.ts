import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BookingPayload {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  serviceType: string;
  cleaningLevel?: string;
  serviceSize?: string;
  productSelection?: string[];
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqft?: number | null;
  date: string;
  time: string;
  instructions?: string;
  addOns: string[];
  total: number;
  deposit: number;
  balance: number;
  userId?: string;
  status: 'Pending' | 'Pending Deposit' | 'Deposit Paid' | 'In Progress' | 'Completed' | 'Balance Paid';
  health_acknowledged?: boolean;
  health_notes?: string | null;
}

interface ApiBookingRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  service_type: string;
  cleaning_level?: string | null;
  service_size?: string | null;
  product_selection?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  size_sqft?: number | null;
  date: string;
  time?: string | null;
  instructions?: string | null;
  add_ons?: string | null;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  status?: string | null;
  health_acknowledged?: boolean;
  health_notes?: string | null;
}

export interface BookingFilters {
  email?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  // use v2 endpoint which persists to MySQL
  private apiUrl = '/api/v2/bookings';

  constructor(private http: HttpClient) {}

  /** Persist booking to the backend. Falls back to a resolved observable if offline/backend missing. */
  submitBooking(data: BookingPayload, token?: string | null): Observable<BookingPayload> {
    return this.http.post<BookingPayload>(this.apiUrl, data, {
      headers: token ? { 'x-auth-token': token } : undefined
    }).pipe(
      map((res) => res)
    );
  }

  /** Fetch bookings for the authenticated user. */
  getBookingsForCurrentUser(token: string): Observable<BookingPayload[]> {
    return this.http.get<ApiBookingRow[]>(this.apiUrl, {
      headers: { 'x-auth-token': token }
    }).pipe(
      map((rows) => rows.map(toBookingPayload)),
      catchError(() => of([]))
    );
  }

  /** Fetch bookings for admin with optional filters. */
  getBookingsForAdmin(token: string, filters: BookingFilters = {}): Observable<BookingPayload[]> {
    let params = new HttpParams();
    if (filters.email) params = params.set('email', filters.email);
    if (filters.userId) params = params.set('userId', filters.userId);
    return this.http.get<ApiBookingRow[]>(this.apiUrl, {
      headers: { 'x-auth-token': token },
      params
    }).pipe(
      map((rows) => rows.map(toBookingPayload)),
      catchError(() => of([]))
    );
  }
}

function normalizeStatus(raw?: string | null): BookingPayload['status'] {
  const normalized = (raw || '').toString().trim().toLowerCase();
  switch (normalized) {
    case 'pending_deposit':
      return 'Pending Deposit';
    case 'pending_payment':
      return 'Pending';
    case 'deposit_paid':
      return 'Deposit Paid';
    case 'in_progress':
      return 'In Progress';
    case 'balance_paid':
      return 'Balance Paid';
    case 'completed':
      return 'Completed';
    default:
      return 'Pending';
  }
}

function safeJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toBookingPayload(row: ApiBookingRow): BookingPayload {
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    address: '',
    serviceType: row.service_type,
    cleaningLevel: row.cleaning_level || undefined,
    serviceSize: row.service_size || undefined,
    productSelection: safeJsonArray(row.product_selection),
    propertyType: row.property_type || '',
    bedrooms: Number(row.bedrooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    sizeSqft: row.size_sqft ?? null,
    date: row.date,
    time: row.time || '',
    instructions: row.instructions || undefined,
    addOns: safeJsonArray(row.add_ons),
    total: Number(row.total_cents || 0) / 100,
    deposit: Number(row.deposit_cents || 0) / 100,
    balance: Number(row.balance_cents || 0) / 100,
    userId: row.user_id,
    status: normalizeStatus(row.status)
  };
}
