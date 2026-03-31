import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, Type } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  a11yPanelComponent: Type<unknown> | null = null;
  cookiePopupComponent: Type<unknown> | null = null;
  private nonCriticalCssLoaded = false;
  private a11yUiLoading = false;
  private cookieUiLoading = false;
  private deferredUiHandler: (() => void) | null = null;
  private cookieOpenHandler: (() => void) | null = null;
  private cookieFallbackTimer: number | null = null;

  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.loadRouteCss(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.loadRouteCss(event.urlAfterRedirects || event.url);
      }
    });
    this.setupDeferredUiInteractionLoad();
    this.setupCookiePopupOpenListener();
    this.scheduleCookieFallbackLoad();
  }

  ngOnDestroy(): void {
    this.removeDeferredUiInteractionLoad();
    this.removeCookiePopupOpenListener();
    if (this.cookieFallbackTimer !== null) {
      clearTimeout(this.cookieFallbackTimer);
      this.cookieFallbackTimer = null;
    }
  }

  private loadRouteCss(url: string): void {
    if (this.nonCriticalCssLoaded) return;
    if (!this.routeNeedsNonCriticalCss(url)) return;

    const existing = this.document.getElementById('ff-non-critical-css') as HTMLLinkElement | null;
    if (existing) {
      this.nonCriticalCssLoaded = true;
      return;
    }

    const link = this.document.createElement('link');
    link.id = 'ff-non-critical-css';
    link.rel = 'stylesheet';
    link.href = 'assets/css/non-critical.css';
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };

    this.document.head.appendChild(link);
    this.nonCriticalCssLoaded = true;
  }

  private routeNeedsNonCriticalCss(url: string): boolean {
    const path = String(url || '').split('?')[0].split('#')[0].toLowerCase();
    return (
      path === '/products' ||
      path.startsWith('/products/') ||
      path === '/services' ||
      path.startsWith('/services/')
    );
  }

  private setupDeferredUiInteractionLoad(): void {
    const win = this.document.defaultView;
    if (!win) return;

    const handler = () => {
      this.removeDeferredUiInteractionLoad();
      void this.loadA11yUi();
      void this.loadCookieUi();
    };

    this.deferredUiHandler = handler;
    win.addEventListener('pointerdown', handler, { once: true, passive: true });
    win.addEventListener('touchstart', handler, { once: true, passive: true });
    win.addEventListener('keydown', handler, { once: true });
  }

  private removeDeferredUiInteractionLoad(): void {
    const win = this.document.defaultView;
    if (!win || !this.deferredUiHandler) return;
    win.removeEventListener('pointerdown', this.deferredUiHandler);
    win.removeEventListener('touchstart', this.deferredUiHandler);
    win.removeEventListener('keydown', this.deferredUiHandler);
    this.deferredUiHandler = null;
  }

  private scheduleCookieFallbackLoad(): void {
    const win = this.document.defaultView;
    if (!win) return;
    this.cookieFallbackTimer = win.setTimeout(() => {
      void this.loadCookieUi();
    }, 10000);
  }

  private setupCookiePopupOpenListener(): void {
    const win = this.document.defaultView;
    if (!win) return;

    const handler = () => {
      void this.loadCookieUi(true);
    };

    this.cookieOpenHandler = handler;
    win.addEventListener('ff-open-cookie-popup', handler as EventListener);
  }

  private removeCookiePopupOpenListener(): void {
    const win = this.document.defaultView;
    if (!win || !this.cookieOpenHandler) return;
    win.removeEventListener('ff-open-cookie-popup', this.cookieOpenHandler as EventListener);
    this.cookieOpenHandler = null;
  }

  private async loadA11yUi(): Promise<void> {
    if (this.a11yUiLoading || this.a11yPanelComponent) return;
    this.a11yUiLoading = true;
    try {
      const a11yCmp = await import('./shared/a11y-panel/a11y-panel.component');
      this.a11yPanelComponent = a11yCmp.A11yPanelComponent;
    } finally {
      this.a11yUiLoading = false;
    }
  }

  private async loadCookieUi(forceOpen = false): Promise<void> {
    if (this.cookieUiLoading) return;
    if (forceOpen) this.setForceCookiePopupFlag();
    if (this.cookiePopupComponent) {
      if (forceOpen) this.dispatchCookiePopupOpen();
      return;
    }
    if (!forceOpen && this.hasCookieConsent()) return;
    this.cookieUiLoading = true;
    try {
      const cookieCmp = await import('./shared/cookie-popup/cookie-popup.component');
      this.cookiePopupComponent = cookieCmp.CookiePopupComponent;
      if (forceOpen) this.dispatchCookiePopupOpen();
    } finally {
      this.cookieUiLoading = false;
    }
  }

  private setForceCookiePopupFlag(): void {
    const win = this.document.defaultView;
    if (!win) return;
    try {
      win.sessionStorage.setItem('finishfino_force_cookie_popup', '1');
    } catch {
      // Ignore storage access failures.
    }
  }

  private dispatchCookiePopupOpen(): void {
    const win = this.document.defaultView;
    if (!win) return;
    win.dispatchEvent(new CustomEvent('ff-open-cookie-popup'));
  }

  private hasCookieConsent(): boolean {
    const win = this.document.defaultView;
    if (!win) return false;
    try {
      return !!win.localStorage.getItem('finishfino_cookie_consent');
    } catch {
      return false;
    }
  }
}
