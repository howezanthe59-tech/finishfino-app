import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProductCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const CART_KEY = 'finishfino_cart';

@Injectable({ providedIn: 'root' })
export class ProductCartService {
  private itemsSubject: BehaviorSubject<ProductCartItem[]>;

  constructor() {
    this.itemsSubject = new BehaviorSubject<ProductCartItem[]>(this.read());
  }

  get items$(): Observable<ProductCartItem[]> {
    return this.itemsSubject.asObservable();
  }

  get items(): ProductCartItem[] {
    return this.itemsSubject.value;
  }

  add(item: ProductCartItem): void {
    const next = [...this.items];
    const existing = next.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      next.push(item);
    }
    this.update(next);
  }

  updateQuantity(id: string, quantity: number): void {
    const next = this.items.map((i) =>
      i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i
    ).filter((i) => i.quantity > 0);
    this.update(next);
  }

  remove(id: string): void {
    this.update(this.items.filter((i) => i.id !== id));
  }

  clear(): void {
    this.update([]);
  }

  private update(items: ProductCartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this.itemsSubject.next(items);
  }

  private read(): ProductCartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as ProductCartItem[]) : [];
    } catch {
      return [];
    }
  }
}
