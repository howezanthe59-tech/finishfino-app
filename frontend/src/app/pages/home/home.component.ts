import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (id: number) => void;
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  showDeferredSections = false;
  private idleHandle: number | null = null;
  private deferTimer: number | null = null;

  constructor(private ngZone: NgZone) {}

  services = [
    { icon: '\u{1F3E0}', title: 'Residential Cleaning' },
    { icon: '\u{1F3E2}', title: 'Commercial Cleaning' },
    { icon: '\u{1F9F9}', title: 'Janitorial Services' },
  ];

  reasons = [
    'High-quality and reliable service',
    'Trained and insured professionals',
    'Customized cleaning plans',
    'Customer satisfaction guaranteed',
    'Eco-friendly cleaning products',
    'Flexible scheduling options',
  ];

  ngOnInit(): void {
    this.deferBelowFoldSections();
  }

  ngOnDestroy(): void {
    const win = window as IdleWindow;
    if (this.idleHandle !== null && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(this.idleHandle);
      this.idleHandle = null;
    }

    if (this.deferTimer !== null) {
      clearTimeout(this.deferTimer);
      this.deferTimer = null;
    }
  }

  scrollToContent(): void {
    if (!this.showDeferredSections) {
      this.showDeferredSections = true;
      setTimeout(() => this.scrollToContent(), 0);
      return;
    }

    const services = document.querySelector('.services');
    if (services) {
      services.scrollIntoView({ behavior: 'smooth' });
    }
  }

  trackByService(_: number, service: { title: string }): string {
    return service.title;
  }

  trackByReason(_: number, reason: string): string {
    return reason;
  }

  private deferBelowFoldSections(): void {
    const win = window as IdleWindow;
    if (typeof win.requestIdleCallback === 'function') {
      this.idleHandle = win.requestIdleCallback(() => {
        this.revealDeferredSections();
      }, { timeout: 1200 });
      return;
    }

    this.deferTimer = win.setTimeout(() => {
      this.revealDeferredSections();
    }, 300);
  }

  private revealDeferredSections(): void {
    this.ngZone.run(() => {
      this.showDeferredSections = true;
    });
  }
}
