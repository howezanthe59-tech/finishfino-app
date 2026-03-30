import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  created_at: string;
}

export interface AdminProductRow {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category: string | null;
  stock_quantity: number | null;
  status: 'in_stock' | 'out_of_stock';
  sku: string | null;
  image_url: string | null;
  additional_images: string[];
  badge: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = '/api/admin';
  private productsUrl = '/api/products';

  constructor(private http: HttpClient) {}

  getUsers(token: string): Observable<AdminUserRow[]> {
    return this.http.get<AdminUserRow[]>(`${this.apiUrl}/users`, {
      headers: { 'x-auth-token': token }
    }).pipe(
      catchError(() => of([]))
    );
  }

  getProducts(token: string): Observable<AdminProductRow[]> {
    return this.http.get<AdminProductRow[]>(this.productsUrl, {
      headers: { 'x-auth-token': token }
    });
  }

  createProduct(
    token: string,
    payload: {
      name: string;
      description: string;
      price: number | null;
      category: string;
      stock_quantity: number | null;
      status: 'in_stock' | 'out_of_stock';
      sku: string | null;
    },
    primaryImageFile: File | null,
    additionalImageFiles: File[]
  ): Observable<AdminProductRow> {
    const fd = new FormData();
    fd.append('name', payload.name);
    fd.append('description', payload.description);
    if (payload.price != null) fd.append('price', String(payload.price));
    fd.append('category', payload.category);
    if (payload.stock_quantity != null) fd.append('stock_quantity', String(payload.stock_quantity));
    fd.append('status', payload.status);
    if (payload.sku) fd.append('sku', payload.sku);

    if (primaryImageFile) fd.append('image', primaryImageFile);
    additionalImageFiles.forEach((f) => fd.append('additional_images', f));

    return this.http.post<AdminProductRow>(this.productsUrl, fd, {
      headers: { 'x-auth-token': token }
    });
  }

  updateProduct(
    token: string,
    payload: {
      id?: string;
      name: string;
      description: string;
      price: number | null;
      category: string;
      stock_quantity: number | null;
      status: 'in_stock' | 'out_of_stock';
      sku: string | null;
      additional_images_existing: string[];
    },
    primaryImageFile: File | null,
    additionalImageFiles: File[]
  ): Observable<AdminProductRow> {
    if (!payload.id) {
      throw new Error('Missing product id.');
    }

    const fd = new FormData();
    fd.append('name', payload.name);
    fd.append('description', payload.description);
    if (payload.price != null) fd.append('price', String(payload.price));
    fd.append('category', payload.category);
    if (payload.stock_quantity != null) fd.append('stock_quantity', String(payload.stock_quantity));
    fd.append('status', payload.status);
    if (payload.sku) fd.append('sku', payload.sku);
    fd.append('additional_images_existing', JSON.stringify(payload.additional_images_existing || []));

    if (primaryImageFile) fd.append('image', primaryImageFile);
    additionalImageFiles.forEach((f) => fd.append('additional_images', f));

    return this.http.put<AdminProductRow>(`${this.productsUrl}/${payload.id}`, fd, {
      headers: { 'x-auth-token': token }
    });
  }

  deleteProduct(token: string, id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.productsUrl}/${id}`, {
      headers: { 'x-auth-token': token }
    });
  }

  /** Update only the product category (table-inline editing). */
  updateProductCategory(token: string, id: string, category: string): Observable<AdminProductRow> {
    const fd = new FormData();
    fd.append('category', category);
    return this.http.put<AdminProductRow>(`${this.productsUrl}/${id}`, fd, {
      headers: { 'x-auth-token': token }
    });
  }
}
