import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderPayload {
  items: OrderItem[];
  totals: { total: number; deposit?: number; balance?: number };
  customer: { fullName: string; email: string; phone: string; address: string };
}

export interface OrderResponse {
  orderId: string;
}

export interface OrderHistoryItem {
  id: string;
  items: OrderItem[];
  total: number;
  deposit: number;
  balance: number;
  status: string;
  createdAt: string;
  userId?: string;
}

interface ApiOrderRow {
  id: string;
  user_id: string;
  items: string;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = '/api/orders';

  constructor(private http: HttpClient) {}

  submitOrder(payload: OrderPayload, token?: string | null): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.apiUrl, payload, {
      headers: token ? { 'x-auth-token': token } : undefined
    });
  }

  getOrdersForCurrentUser(token: string): Observable<OrderHistoryItem[]> {
    return this.http.get<ApiOrderRow[]>(this.apiUrl, {
      headers: { 'x-auth-token': token }
    }).pipe(
      map((rows) => rows.map(toOrderHistory)),
      catchError(() => of([]))
    );
  }

  getOrdersForAdmin(token: string, userId?: string): Observable<OrderHistoryItem[]> {
    const params = userId ? { userId } : undefined;
    return this.http.get<ApiOrderRow[]>(this.apiUrl, {
      headers: { 'x-auth-token': token },
      params
    }).pipe(
      map((rows) => rows.map(toOrderHistory)),
      catchError(() => of([]))
    );
  }
}

function safeJsonArray(raw?: string | null): OrderItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toOrderHistory(row: ApiOrderRow): OrderHistoryItem {
  return {
    id: row.id,
    items: safeJsonArray(row.items),
    total: Number(row.total_cents || 0) / 100,
    deposit: Number(row.deposit_cents || 0) / 100,
    balance: Number(row.balance_cents || 0) / 100,
    status: normalizeOrderStatus(row.status),
    createdAt: row.created_at,
    userId: row.user_id
  };
}

function normalizeOrderStatus(raw?: string | null): string {
  const normalized = (raw || '').toString().trim().toLowerCase();
  switch (normalized) {
    case 'pending_payment':
      return 'Pending Payment';
    case 'paid':
      return 'Paid';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    default:
      return raw ? raw : 'Pending Payment';
  }
}
