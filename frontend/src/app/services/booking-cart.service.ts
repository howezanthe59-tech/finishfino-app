import { Injectable } from '@angular/core';
import { BookingPayload } from './booking.service';

export interface BookingCartItem extends BookingPayload {
  id: string;
}

const CART_KEY = 'finishfino_booking_cart';

@Injectable({ providedIn: 'root' })
export class BookingCartService {
  private items: BookingCartItem[] = [];

  constructor() {
    this.items = this.read();
  }

  getAll(): BookingCartItem[] {
    return [...this.items];
  }

  add(item: BookingPayload): BookingCartItem {
    const newItem: BookingCartItem = { id: `bk-${Date.now()}`, ...item };
    this.items.unshift(newItem);
    this.persist();
    return newItem;
  }

  clear(): void {
    this.items = [];
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
  }

  private read(): BookingCartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as BookingCartItem[]) : [];
    } catch {
      return [];
    }
  }
}
