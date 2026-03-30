import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProfileService, CustomerProfile } from '../../services/profile.service';
import { BookingCartService } from '../../services/booking-cart.service';
import { ProductCartService } from '../../services/product-cart.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  profile: CustomerProfile | null = null;
  firstName = '';
  sub?: Subscription;
  cartCount = 0;
  cartSub?: Subscription;

  constructor(
    private profileService: ProfileService,
    private bookingCart: BookingCartService,
    private productCart: ProductCartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.profileService.profile$.subscribe((p) => {
      this.profile = p;
      this.firstName = this.extractFirstName(p?.fullName);
    });
    // cart count updates (product cart)
    this.cartSub = this.productCart.items$.subscribe((items) => {
      this.cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.cartSub?.unsubscribe();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  isLoggedIn(): boolean {
    return !!this.profile;
  }

  isAdmin(): boolean {
    return this.profile?.role === 'admin';
  }

  goDashboard(): void {
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  openCart(): void {
    this.router.navigate(['/products'], { queryParams: { cart: 'open', ts: Date.now() } });
    this.menuOpen = false;
  }

  logout(): void {
    this.profileService.clearProfile();
    this.authService.clearToken();
    this.profile = null;
    this.firstName = '';
    this.cartCount = 0;
    this.bookingCart.clear();
    this.productCart.clear();
    this.router.navigate(['/']);
  }

  private loadProfile(): void {
    this.profile = this.profileService.getProfile();
    this.firstName = this.extractFirstName(this.profile?.fullName);
  }

  private extractFirstName(fullName?: string | null): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ').filter(Boolean);
    return parts[0] || fullName;
  }
}
