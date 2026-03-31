import { Component, HostListener, OnInit } from '@angular/core';
import { CookieService } from '../../services/cookie.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cookie-popup',
  templateUrl: './cookie-popup.component.html',
  styleUrls: ['./cookie-popup.component.css']
})
export class CookiePopupComponent implements OnInit {
  isVisible = false;
  private readonly forceOpenKey = 'finishfino_force_cookie_popup';

  constructor(
    private cookieService: CookieService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const forceOpen = this.consumeForceOpenFlag();
    this.isVisible = forceOpen || !this.cookieService.hasConsented();
  }

  @HostListener('window:ff-open-cookie-popup')
  onOpenRequested(): void {
    this.isVisible = true;
  }

  acceptAll(): void {
    this.cookieService.acceptAll();
    this.isVisible = false;
  }

  browseSettings(): void {
    this.router.navigate(['/privacy'], { fragment: 'cookie-settings' });
    this.isVisible = false;
  }

  private consumeForceOpenFlag(): boolean {
    try {
      const forceOpen = sessionStorage.getItem(this.forceOpenKey) === '1';
      if (forceOpen) sessionStorage.removeItem(this.forceOpenKey);
      return forceOpen;
    } catch {
      return false;
    }
  }
}
