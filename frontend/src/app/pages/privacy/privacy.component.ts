import { Component, OnInit } from '@angular/core';
import { CookieService, CookiePreferences } from '../../services/cookie.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.css']
})
export class PrivacyComponent implements OnInit {
  preferences: CookiePreferences = {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false
  };

  saveSuccess = false;

  constructor(private cookieService: CookieService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    const current = this.cookieService.getStoredPreferences();
    if (current) {
      this.preferences = { ...current };
    }

    // Scroll to section if fragment matches
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'cookie-settings') {
        setTimeout(() => {
          const element = document.getElementById('cookie-settings');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    });
  }

  savePreferences(): void {
    this.cookieService.setConsent(this.preferences);
    this.showSuccess();
  }

  acceptAll(): void {
    this.cookieService.acceptAll();
    this.preferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    this.showSuccess();
  }

  rejectNonEssential(): void {
    this.cookieService.rejectNonEssential();
    this.preferences = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    };
    this.showSuccess();
  }

  private showSuccess(): void {
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
  }
}
