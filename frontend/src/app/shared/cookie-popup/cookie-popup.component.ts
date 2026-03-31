import { Component, OnInit } from '@angular/core';
import { CookieService } from '../../services/cookie.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cookie-popup',
  templateUrl: './cookie-popup.component.html',
  styleUrls: ['./cookie-popup.component.css']
})
export class CookiePopupComponent implements OnInit {
  isVisible = false;

  constructor(
    private cookieService: CookieService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Show popup only if no consent has been given
    this.isVisible = !this.cookieService.hasConsented();
  }

  acceptAll(): void {
    this.cookieService.acceptAll();
    this.isVisible = false;
  }

  browseSettings(): void {
    this.router.navigate(['/privacy'], { fragment: 'cookie-settings' });
    this.isVisible = false;
  }
}
