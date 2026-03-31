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
  payment?: { accountType: string; accountLast4: string };
  customer: { fullName: string; email: string; phone: string; address: string };
}

export interface OrderResponse {
  orderId: string;
}

export interface PayPalConfigResponse {
  clientId: string;
  currency: string;
  intent: string;
}

export interface PayPalCreateOrderResponse {
  paypalOrderId: string;
}

export interface PayPalCaptureOrderResponse {
  orderId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  alreadyCaptured?: boolean;
  totals?: {
    total: number;
    deposit: number;
    balance: number;
  };
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
  total_items: number;
  paymentAccountType?: string;
  paymentAccountLast4?: string;
}

export interface OrderTrackingDetails {
  order_id: string;
  user_id: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  total_items: number;
  payment_account_type?: string;
  payment_account_last4?: string;
}

interface ApiOrderRow {
  id: string;
  user_id: string;
  items: string | OrderItem[] | null;
  total_cents: number;
  deposit_cents: number;
  balance_cents: number;
  payment_account_type?: string | null;
  payment_account_last4?: string | null;
  status: string;
  payment_status?: string;
  created_at: string;
  total_items?: string | number;
}

interface ApiOrderTrackingRow {
  order_id: string;
  user_id: string;
  order_status?: string | null;
  payment_status?: string | null;
  payment_account_type?: string | null;
  payment_account_last4?: string | null;
  created_at: string;
  total_items?: string | number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiUrl = '/api/orders';
  private paypalUrl = '/api/paypal';

  constructor(private http: HttpClient) {}

  private buildAuthHeaders(token?: string | null): { [header: string]: string } | undefined {
    const trimmed = String(token || '').trim();
    if (!trimmed || trimmed === 'cookie-session') return undefined;
    return { 'x-auth-token': trimmed };
  }

  submitOrder(payload: OrderPayload, token?: string | null): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.apiUrl, payload, {
      headers: this.buildAuthHeaders(token)
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

  getOrderById(orderId: string, token: string): Observable<OrderTrackingDetails | null> {
    return this.http.get<ApiOrderTrackingRow>(`${this.apiUrl}/${orderId}`, {
      headers: { 'x-auth-token': token }
    }).pipe(
      map(toOrderTrackingDetails),
      catchError(() => of(null))
    );
  }

  getPayPalConfig(): Observable<PayPalConfigResponse> {
    return this.http.get<PayPalConfigResponse>(`${this.paypalUrl}/config`);
  }

  createPayPalOrder(payload: OrderPayload, token?: string | null): Observable<PayPalCreateOrderResponse> {
    return this.http.post<PayPalCreateOrderResponse>(`${this.paypalUrl}/orders`, payload, {
      headers: this.buildAuthHeaders(token)
    });
  }

  capturePayPalOrder(paypalOrderId: string, payload: OrderPayload, token?: string | null): Observable<PayPalCaptureOrderResponse> {
    return this.http.post<PayPalCaptureOrderResponse>(`${this.paypalUrl}/orders/${encodeURIComponent(paypalOrderId)}/capture`, payload, {
      headers: this.buildAuthHeaders(token)
    });
  }
}

function safeJsonArray(raw?: string | OrderItem[] | null): OrderItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as OrderItem[];
  if (typeof raw !== 'string') return [];
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
    status: normalizeOrderStatus(row.payment_status || row.status),
    createdAt: row.created_at,
    userId: row.user_id,
    total_items: Number(row.total_items || 0),
    paymentAccountType: normalizeAccountType(row.payment_account_type),
    paymentAccountLast4: normalizeLast4(row.payment_account_last4)
  };
}

function normalizeOrderStatus(raw?: string | null): string {
  const normalized = (raw || '').toString().trim().toLowerCase();
  switch (normalized) {
    case 'pending_payment':
    case 'pending':
      return 'Pending Payment';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Payment Failed';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    default:
      return raw ? raw : 'Pending Payment';
  }
}

function toOrderTrackingDetails(row: ApiOrderTrackingRow): OrderTrackingDetails {
  const orderStatusRaw = (row.order_status || '').toString().trim();
  const paymentStatusRaw = (row.payment_status || '').toString().trim();
  return {
    order_id: row.order_id,
    user_id: row.user_id,
    order_status: orderStatusRaw || paymentStatusRaw || 'pending',
    payment_status: paymentStatusRaw || orderStatusRaw || 'pending',
    payment_account_type: normalizeAccountType(row.payment_account_type),
    payment_account_last4: normalizeLast4(row.payment_account_last4),
    created_at: row.created_at,
    total_items: Number(row.total_items || 0)
  };
}

function normalizeAccountType(raw?: string | null): string | undefined {
  const value = (raw || '').toString().trim().toLowerCase();
  if (!value) return undefined;
  switch (value) {
    case 'checking':
      return 'Checking';
    case 'savings':
      return 'Savings';
    case 'credit':
      return 'Credit';
    case 'debit':
      return 'Debit';
    case 'paypal':
      return 'PayPal';
    default:
      return value;
  }
}

function normalizeLast4(raw?: string | null): string | undefined {
  const digits = String(raw || '').replace(/\D/g, '').slice(-4);
  return digits.length === 4 ? digits : undefined;
}
