import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { ProductCartService, ProductCartItem } from '../../services/product-cart.service';
import { OrderService, OrderPayload, PayPalCaptureOrderResponse, PayPalConfigResponse, PayPalCreateOrderResponse } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom, Subscription } from 'rxjs';

export interface Product {
  id: string;
  name: string;
  image: string;
  alt: string;
  badge?: string;
  badgeNew?: boolean;
  price: number;
  description: string;
  features: string[];
  emoji: string;
}

export interface Bundle {
  id: string;
  icon: string;
  name: string;
  savings: string;
  items: string[];
  originalPrice: number;
  bundlePrice: number;
  cartName: string;
  featured?: boolean;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit, OnDestroy {
  @ViewChild('productModal') productModalRef?: ElementRef<HTMLElement>;
  @ViewChild('productModalClose') productModalCloseRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('cartPanel') cartPanelRef?: ElementRef<HTMLElement>;
  @ViewChild('cartClose') cartCloseRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('paypalButtons') paypalButtonsRef?: ElementRef<HTMLDivElement>;
  cartOpen = false;
  checkoutOpen = false;
  checkoutSubmitted = false;
  orderPlaced = false;
  paypalReady = false;
  paypalLoading = false;
  paypalErrorMessage = '';
  cartItems: ProductCartItem[] = [];
  selectedProduct: Product | null = null;
  modalOpen = false;
  orderNumber = '';
  private sub?: Subscription;
  private lastFocusedElement: HTMLElement | null = null;
  private lastFocusedCartElement: HTMLElement | null = null;
  private paypalScriptPromise: Promise<void> | null = null;
  private paypalConfig: PayPalConfigResponse | null = null;
  private paypalButtonActions: any = null;

  checkoutData: CheckoutFormData = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  products: Product[] = [
    {
      id: 'multi-surface',
      name: 'ProClean Multi-Surface Soap',
      image: 'assets/images/multi surface.webp',
      alt: 'ProClean Multi-Surface Soap',
      badge: 'Best Seller',
      price: 24.99,
      emoji: '🧴',
      description: 'Powerful yet gentle formula perfect for all surfaces. Cuts through grease and grime while leaving a fresh, clean scent.',
      features: ['Safe for all surfaces', 'Biodegradable formula', 'Fresh lemon scent', '1 Gallon (3.78L)']
    },
    {
      id: 'disinfectant',
      name: 'FinishFino Disinfectant Spray',
      image: 'assets/images/disinfectant.webp',
      alt: 'FinishFino Disinfectant Spray',
      badge: 'New',
      badgeNew: true,
      price: 18.99,
      emoji: '🦠',
      description: 'Kill 99.9% of germs, bacteria, and viruses. EPA-approved formula for professional sanitization.',
      features: ['Kills 99.9% of germs', 'No harsh fumes', '32 oz (946ml) spray bottle']
    },
    {
      id: 'bleach',
      name: 'Professional Strength Bleach',
      image: 'assets/images/bleach.webp',
      alt: 'Professional Strength Bleach',
      price: 12.99,
      emoji: '⚪',
      description: 'Maximum whitening and sanitizing power. Perfect for tough stains and deep cleaning tasks.',
      features: ['Maximum strength formula', 'Whitens & brightens', 'Removes tough stains', '64 oz (1.89L)']
    },
    {
      id: 'cloths',
      name: 'Premium Microfiber Cloths',
      image: 'assets/images/cloth.webp',
      alt: 'Premium Microfiber Cloths',
      badge: 'Popular',
      price: 16.99,
      emoji: '🧽',
      description: 'Ultra-absorbent microfiber cloths that trap dirt and dust. Reusable and machine washable.',
      features: ['Pack of 12 cloths', 'Ultra-absorbent', 'Lint-free cleaning', 'Machine washable']
    },
    {
      id: 'fresh-linen',
      name: 'Fresh Linen Home Spray',
      image: 'assets/images/home spray.webp',
      alt: 'Fresh Linen Home Spray',
      price: 14.99,
      emoji: '🌸',
      description: 'Long-lasting fresh linen scent that eliminates odors and leaves your home smelling clean and inviting.',
      features: ['Fresh linen fragrance', 'Odor eliminator', 'Natural ingredients', '16 oz (473ml) spray']
    },
    {
      id: 'lavender',
      name: 'Lavender Dreams Home Spray',
      image: 'assets/images/lavender dreams.webp',
      alt: 'Lavender Dreams Home Spray',
      price: 14.99,
      emoji: '💜',
      description: 'Calming lavender scent creates a relaxing atmosphere. Perfect for bedrooms and living spaces.',
      features: ['Soothing lavender scent', 'Aromatherapy benefits', 'All-natural formula', '16 oz (473ml) spray']
    },
    {
      id: 'citrus',
      name: 'Citrus Burst Home Spray',
      image: 'assets/images/citrus blast.webp',
      alt: 'Citrus Burst Home Spray',
      price: 14.99,
      emoji: '🍋',
      description: 'Energizing citrus blend that freshens any room. Uplifting and invigorating fragrance.',
      features: ['Zesty citrus scent', 'Energy-boosting aroma', 'Natural essential oils', '16 oz (473ml) spray']
    },
    {
      id: 'glass-cleaner',
      name: 'Streak-Free Glass Cleaner',
      image: 'assets/images/Glass cleaner.webp',
      alt: 'Streak-Free Glass Cleaner',
      price: 11.99,
      emoji: '🪟',
      description: 'Crystal-clear shine without streaks. Ammonia-free formula safe for all glass surfaces.',
      features: ['Streak-free formula', 'Ammonia-free', 'Anti-fog protection', '32 oz (946ml) spray']
    },
    {
      id: 'all-purpose',
      name: 'Ultimate All-Purpose Cleaner',
      image: 'assets/images/soap.webp',
      alt: 'Ultimate All-Purpose Cleaner',
      badge: 'Best Value',
      price: 22.99,
      emoji: '🧹',
      description: 'One cleaner for everything. Tackles kitchen grease, bathroom grime, and everyday messes.',
      features: ['Works on any surface', 'Concentrated formula', 'Eco-friendly', '1 Gallon (3.78L)']
    }
  ];

  bundles: Bundle[] = [
    {
      icon: '🏠',
      name: 'Home Essentials Bundle',
      savings: 'Save $15',
      items: ['Multi-Surface Soap', 'Professional Strength Bleach', 'Disinfectant', 'Microfiber Cloths (Pack of 12)', 'Fresh Linen Spray'],
      originalPrice: 88.96,
      bundlePrice: 73.99,
      id: 'bundle-home',
      cartName: 'Home Essentials Bundle'
    },
    {
      icon: '🦠',
      name: 'Commercial Bundle',
      savings: 'Save $25',
      items: ['Multi-Surface Soap', 'Disinfectant', 'Professional Bleach', 'Microfiber Cloths (Pack of 12)', 'Streak-Free Glass Cleaner'],
      originalPrice: 196.95,
      bundlePrice: 71.99,
      id: 'bundle-commercial',
      cartName: 'Commercial Bundle',
      featured: true
    },
    {
      icon: '🌸',
      name: 'Fresh Space Bundle',
      savings: 'Save $11',
      items: ['Fresh Linen Spray', 'Disinfectant', 'Microfiber Cloths (Pack of 12)', 'Professional Bleach', 'All-Purpose Cleaner'],
      originalPrice: 86.95,
      bundlePrice: 75.99,
      id: 'bundle-fresh-space',
      cartName: 'Fresh Space Bundle'
    }
  ];

  whyBuyItems = [
    { icon: '🏆', title: 'Professional Quality', description: 'The same premium products our cleaning experts use every day' },
    { icon: '🌿', title: 'Eco-Friendly', description: 'Safe for your family, pets, and the environment' },
    { icon: '🚚', title: 'Fast Shipping', description: 'Free delivery on orders over $50' }
  ];

  constructor(
    private profileService: ProfileService,
    private productCart: ProductCartService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.sub = this.productCart.items$.subscribe((items) => {
      this.cartItems = items;
      this.updatePayPalButtonState();
    });
    this.route.queryParams.subscribe((params) => {
      if (params['cart'] === 'open') {
        this.cartOpen = true;
        this.checkoutOpen = false;
        this.orderPlaced = false;
        setTimeout(() => {
          this.cartCloseRef?.nativeElement.focus();
        }, 0);
      }
    });
  }

  get cartSubtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get cartTotal(): number {
    return this.cartSubtotal;
  }

  get cartCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get isLoggedIn(): boolean {
    return !!this.profileService.getProfile();
  }

  toggleCart(): void {
    if (this.cartOpen) {
      this.closeCartPanel();
      return;
    }

    if (!this.ensureLoggedIn()) {
      this.cartOpen = false;
      return;
    }
    this.checkoutOpen = false;
    this.orderPlaced = false;
    this.openCartPanel();
  }

  addToCart(name: string, price: number, id: string = name.toLowerCase().replace(/\s+/g, '-')): void {
    if (!this.ensureLoggedIn()) return;
    this.productCart.add({ id, name, price, quantity: 1 });
    if (!this.cartOpen) {
      this.openCartPanel();
    }
    this.orderPlaced = false;
  }

  incrementQuantity(index: number): void {
    const item = this.cartItems[index];
    this.productCart.updateQuantity(item.id, item.quantity + 1);
  }

  decrementQuantity(index: number): void {
    const item = this.cartItems[index];
    const nextQty = item.quantity - 1;
    if (nextQty > 0) {
      this.productCart.updateQuantity(item.id, nextQty);
    } else {
      this.productCart.remove(item.id);
    }
  }

  removeFromCart(index: number): void {
    const item = this.cartItems[index];
    this.productCart.remove(item.id);
  }

  async openCheckout(): Promise<void> {
    if (!this.cartItems.length) {
      return;
    }

    if (!this.isLoggedIn) {
      this.cartOpen = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      return;
    }

    const hasSession = await this.ensureActiveSession();
    if (!hasSession) return;

    this.applyProfileToCheckout();
    this.checkoutOpen = true;
    this.checkoutSubmitted = false;
    this.paypalErrorMessage = '';
    if (!this.cartOpen) {
      this.openCartPanel();
    }
    this.orderPlaced = false;
    void this.preparePayPalCheckout();
  }

  closeCheckout(): void {
    this.checkoutOpen = false;
    this.checkoutSubmitted = false;
    this.paypalReady = false;
    this.paypalLoading = false;
    this.paypalErrorMessage = '';
    this.paypalButtonActions = null;
  }

  onCheckoutFieldChange(): void {
    if (this.paypalErrorMessage === 'Please complete all required shipping details before paying.') {
      this.paypalErrorMessage = '';
    }
    this.updatePayPalButtonState();
  }

  private async preparePayPalCheckout(): Promise<void> {
    if (!this.checkoutOpen) return;

    this.paypalLoading = true;
    this.paypalReady = false;
    this.paypalErrorMessage = '';

    try {
      if (!this.paypalConfig) {
        this.paypalConfig = await firstValueFrom(this.orderService.getPayPalConfig());
      }
      await this.ensurePayPalScript(this.paypalConfig.clientId, this.paypalConfig.currency || 'USD');
      await this.renderPayPalButtons();
      this.paypalReady = true;
    } catch (err: any) {
      this.paypalErrorMessage = err?.error?.error || err?.message || 'Failed to load PayPal checkout.';
    } finally {
      this.paypalLoading = false;
    }
  }

  private async ensurePayPalScript(clientId: string, currency: string): Promise<void> {
    if (window.paypal) return;
    if (this.paypalScriptPromise) return this.paypalScriptPromise;

    this.paypalScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK script.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture&locale=en_US`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-paypal-sdk', 'true');
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PayPal SDK script.'));
      document.head.appendChild(script);
    });

    return this.paypalScriptPromise;
  }

  private async renderPayPalButtons(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));

    const container = this.paypalButtonsRef?.nativeElement;
    if (!container) throw new Error('PayPal container not found.');
    if (!window.paypal?.Buttons) throw new Error('PayPal SDK did not initialize correctly.');

    container.innerHTML = '';
    this.paypalButtonActions = null;

    const buttons = window.paypal.Buttons({
      style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
      onInit: (_data: any, actions: any) => {
        this.paypalButtonActions = actions;
        this.updatePayPalButtonState();
      },
      onClick: (_data: any, actions: any) => {
        this.checkoutSubmitted = true;
        if (!this.isCheckoutFormValid()) {
          this.paypalErrorMessage = 'Please complete all required shipping details before paying.';
          this.updatePayPalButtonState();
          return actions.reject();
        }
        this.paypalErrorMessage = '';
        this.updatePayPalButtonState();
        return actions.resolve();
      },
      createOrder: async () => {
        this.checkoutSubmitted = true;
        this.paypalErrorMessage = '';

        if (!this.isCheckoutFormValid()) {
          this.paypalErrorMessage = 'Please complete all required shipping details before paying.';
          throw new Error(this.paypalErrorMessage);
        }

        const token = this.authService.getToken();
        if (!token) {
          this.cartOpen = false;
          this.router.navigate(['/login']);
          throw new Error('Authentication required.');
        }

        const payload = this.buildOrderPayload();
        let created: PayPalCreateOrderResponse | null = null;
        try {
          created = await firstValueFrom(this.orderService.createPayPalOrder(payload, token));
        } catch (err: any) {
          if (Number(err?.status) === 401) {
            this.authService.clearToken();
            this.cartOpen = false;
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
            this.paypalErrorMessage = 'Your session expired. Please sign in and try again.';
            throw new Error(this.paypalErrorMessage);
          }
          this.paypalErrorMessage = err?.error?.error || err?.message || 'Failed to create PayPal order.';
          throw err;
        }
        if (!created?.paypalOrderId) {
          throw new Error('PayPal order creation failed.');
        }
        return created.paypalOrderId;
      },
      onApprove: async (data: { orderID?: string }) => {
        const paypalOrderId = String(data?.orderID || '').trim();
        if (!paypalOrderId) throw new Error('Missing PayPal order id.');

        const token = this.authService.getToken();
        if (!token) {
          this.cartOpen = false;
          this.router.navigate(['/login']);
          throw new Error('Authentication required.');
        }

        const payload = this.buildOrderPayload();
        let captured: PayPalCaptureOrderResponse | null = null;
        try {
          captured = await firstValueFrom(this.orderService.capturePayPalOrder(paypalOrderId, payload, token));
        } catch (err: any) {
          this.ngZone.run(() => {
            if (Number(err?.status) === 401) {
              this.authService.clearToken();
              this.cartOpen = false;
              this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
              this.paypalErrorMessage = 'Your session expired. Please sign in and try again.';
              return;
            }
            this.paypalErrorMessage = err?.error?.error || err?.message || 'Failed to capture PayPal payment.';
          });
          throw err;
        }

        this.ngZone.run(() => {
          this.completeSuccessfulCheckout(captured?.orderId || `FF-${Date.now().toString().slice(-6)}`);
        });
      },
      onCancel: () => {
        this.ngZone.run(() => {
          this.paypalErrorMessage = 'PayPal checkout was cancelled.';
        });
      },
      onError: (err: any) => {
        console.error('PayPal button error', err);
        this.ngZone.run(() => {
          this.paypalErrorMessage = 'PayPal checkout failed. Please try again.';
        });
      }
    });

    if (typeof buttons?.isEligible === 'function' && !buttons.isEligible()) {
      throw new Error('PayPal is not eligible for this browser/account.');
    }

    await buttons.render(container);
  }

  private isCheckoutFormValid(): boolean {
    const email = String(this.checkoutData.email || '').trim();
    const fullName = String(this.checkoutData.fullName || '').trim();
    const phone = String(this.checkoutData.phone || '').trim();
    const address = String(this.checkoutData.address || '').trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    return !!fullName && emailValid && !!phone && !!address && this.cartItems.length > 0;
  }

  private updatePayPalButtonState(): void {
    if (!this.paypalButtonActions) return;
    try {
      if (this.isCheckoutFormValid()) {
        this.paypalButtonActions.enable();
      } else {
        this.paypalButtonActions.disable();
      }
    } catch {
      // Ignore transient SDK timing errors while buttons mount.
    }
  }

  private buildOrderPayload(): OrderPayload {
    return {
      items: this.cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      totals: { total: this.cartTotal, deposit: 0, balance: 0 },
      customer: {
        fullName: this.checkoutData.fullName,
        email: this.checkoutData.email,
        phone: this.checkoutData.phone,
        address: this.checkoutData.address
      }
    };
  }

  private completeSuccessfulCheckout(orderId: string): void {
    this.orderNumber = orderId || `FF-${Date.now().toString().slice(-6)}`;
    this.productCart.clear();
    this.cartItems = [];
    this.checkoutOpen = false;
    this.orderPlaced = true;
    this.cartOpen = true;
    this.checkoutSubmitted = false;
    this.paypalReady = false;
    this.paypalLoading = false;
    this.paypalErrorMessage = '';
    this.paypalButtonActions = null;
    this.checkoutData = {
      fullName: '',
      email: '',
      phone: '',
      address: ''
    };
  }

  openModal(product: Product): void {
    this.lastFocusedElement = document.activeElement as HTMLElement | null;
    this.selectedProduct = product;
    this.modalOpen = true;
    setTimeout(() => {
      this.productModalCloseRef?.nativeElement.focus();
    }, 0);
  }

  closeModal(): void {
    this.selectedProduct = null;
    this.modalOpen = false;
    setTimeout(() => {
      this.lastFocusedElement?.focus();
    }, 0);
  }

  addToCartFromModal(): void {
    if (this.selectedProduct) {
      this.addToCart(this.selectedProduct.name, this.selectedProduct.price, this.selectedProduct.id);
      this.closeModal();
    }
  }

  onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const container = this.productModalRef?.nativeElement;
    if (!container) return;

    const focusable = this.getFocusableElements(container);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onCartKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeCartPanel();
      return;
    }

    if (event.key !== 'Tab') return;

    const container = this.cartPanelRef?.nativeElement;
    if (!container) return;

    const focusable = this.getFocusableElements(container);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private ensureLoggedIn(): boolean {
    if (this.profileService.getProfile()) return true;
    this.cartOpen = false;
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
    return false;
  }

  private async ensureActiveSession(): Promise<boolean> {
    try {
      await firstValueFrom(this.authService.me());
      return true;
    } catch {
      this.profileService.clearProfile();
      this.authService.clearToken();
      this.cartOpen = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      this.paypalErrorMessage = 'Your session expired. Please sign in again.';
      return false;
    }
  }

  private applyProfileToCheckout(): void {
    const profile = this.profileService.getProfile();
    if (!profile) return;
    this.checkoutData = {
      fullName: profile.fullName || this.checkoutData.fullName,
      email: profile.email || this.checkoutData.email,
      phone: profile.phone || this.checkoutData.phone,
      address: profile.address || this.checkoutData.address
    };
  }

  private openCartPanel(): void {
    this.lastFocusedCartElement = document.activeElement as HTMLElement | null;
    this.cartOpen = true;
    setTimeout(() => {
      this.cartCloseRef?.nativeElement.focus();
    }, 0);
  }

  private closeCartPanel(): void {
    this.cartOpen = false;
    setTimeout(() => {
      this.lastFocusedCartElement?.focus();
    }, 0);
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
