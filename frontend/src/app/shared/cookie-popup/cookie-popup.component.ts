import { Component, OnDestroy, OnInit } from '@angular/core';
import { CookieService } from '../../services/cookie.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cookie-popup',
  templateUrl: './cookie-popup.component.html',
  styleUrls: ['./cookie-popup.component.css']
})
export class CookiePopupComponent implements OnInit, OnDestroy {
  isVisible = false;
  private routeSub?: Subscription;

  constructor(
    private cookieService: CookieService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.applyVisibilityRule();

    // Re-check on every route visit so guests see it each time they visit pages.
    this.routeSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.applyVisibilityRule();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  acceptAll(): void {
    this.cookieService.acceptAll();
    this.isVisible = false;
  }

  browseSettings(): void {
    this.router.navigate(['/privacy'], { fragment: 'cookie-settings' });
    this.isVisible = false;
  }

  private applyVisibilityRule(): void {
    const isSignedIn = this.hasValidSession();

    // Guests: always show popup on visit.
    // Signed-in users: show only when consent has not been set.
    this.isVisible = isSignedIn ? !this.cookieService.hasConsented() : true;
  }

  private hasValidSession(): boolean {
    const token = this.authService.getToken();
    const profile = this.profileService.getProfile();
    if (!token || !profile) return false;

    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded));

      if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
        // Expired token -> treat as logged out for UI behavior.
        this.authService.clearToken();
        this.profileService.clearProfile();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
