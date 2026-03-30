import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProfileService, CustomerProfile } from '../../services/profile.service';
import { BookingService, BookingPayload } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { OrderService, OrderHistoryItem } from '../../services/order.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  profile: CustomerProfile | null = null;
  bookings: BookingPayload[] = [];
  orders: OrderHistoryItem[] = [];
  firstName = '';
  private profileSub?: Subscription;

  constructor(
    private profileService: ProfileService,
    private bookingService: BookingService,
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.profileSub = this.profileService.profile$.subscribe((p) => {
      this.profile = p;
      this.firstName = this.getFirstName(p?.fullName);
    });
    const token = this.authService.getToken();
    if (!token) {
      this.bookings = [];
      return;
    }
    this.bookingService.getBookingsForCurrentUser(token).subscribe((rows) => {
      this.bookings = rows.slice(0, 5);
    });
    this.orderService.getOrdersForCurrentUser(token).subscribe((rows) => {
      this.orders = rows.slice(0, 5);
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  get avatarUrl(): string | null {
    const url = this.profile?.profileImageUrl || '';
    return url && url.trim() ? url : null;
  }

  get initials(): string {
    const fullName = String(this.profile?.fullName || '').trim();
    if (!fullName) return 'FF';
    const parts = fullName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    const out = (first + last).toUpperCase();
    return out || 'FF';
  }

  private getFirstName(fullName?: string | null): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    return parts[0] || fullName;
  }
}
