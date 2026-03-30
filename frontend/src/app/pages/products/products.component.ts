import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { ProductCartService, ProductCartItem } from '../../services/product-cart.service';
import { OrderService, OrderPayload } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

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
  cartOpen = false;
  checkoutOpen = false;
  checkoutSubmitted = false;
  orderPlaced = false;
  cartItems: ProductCartItem[] = [];
  selectedProduct: Product | null = null;
  modalOpen = false;
  orderNumber = '';
  private sub?: Subscription;
  private lastFocusedElement: HTMLElement | null = null;
  private lastFocusedCartElement: HTMLElement | null = null;

  checkoutData: CheckoutFormData = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  products: Product[] = [
    {
      id: 'multi-surface-soap',
      name: 'ProClean Multi-Surface Soap',
      image: 'assets/images/multi surface.jpeg',
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
      image: 'assets/images/disinnfectant .jpeg',
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
      image: 'assets/images/bleach.jpeg',
      alt: 'Professional Strength Bleach',
      price: 12.99,
      emoji: '⚪',
      description: 'Maximum whitening and sanitizing power. Perfect for tough stains and deep cleaning tasks.',
      features: ['Maximum strength formula', 'Whitens & brightens', 'Removes tough stains', '64 oz (1.89L)']
    },
    {
      id: 'microfiber',
      name: 'Premium Microfiber Cloths',
      image: 'assets/images/cloth.jpeg',
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
      image: 'assets/images/home spray.jpeg',
      alt: 'Fresh Linen Home Spray',
      price: 14.99,
      emoji: '🌸',
      description: 'Long-lasting fresh linen scent that eliminates odors and leaves your home smelling clean and inviting.',
      features: ['Fresh linen fragrance', 'Odor eliminator', 'Natural ingredients', '16 oz (473ml) spray']
    },
    {
      id: 'lavender',
      name: 'Lavender Dreams Home Spray',
      image: 'assets/images/lavender dreams.jpeg',
      alt: 'Lavender Dreams Home Spray',
      price: 14.99,
      emoji: '💜',
      description: 'Calming lavender scent creates a relaxing atmosphere. Perfect for bedrooms and living spaces.',
      features: ['Soothing lavender scent', 'Aromatherapy benefits', 'All-natural formula', '16 oz (473ml) spray']
    },
    {
      id: 'citrus',
      name: 'Citrus Burst Home Spray',
      image: 'assets/images/citrus blast.jpeg',
      alt: 'Citrus Burst Home Spray',
      price: 14.99,
      emoji: '🍋',
      description: 'Energizing citrus blend that freshens any room. Uplifting and invigorating fragrance.',
      features: ['Zesty citrus scent', 'Energy-boosting aroma', 'Natural essential oils', '16 oz (473ml) spray']
    },
    {
      id: 'glass-cleaner',
      name: 'Streak-Free Glass Cleaner',
      image: 'assets/images/Glass cleaner.jpeg',
      alt: 'Streak-Free Glass Cleaner',
      price: 11.99,
      emoji: '🪟',
      description: 'Crystal-clear shine without streaks. Ammonia-free formula safe for all glass surfaces.',
      features: ['Streak-free formula', 'Ammonia-free', 'Anti-fog protection', '32 oz (946ml) spray']
    },
    {
      id: 'all-purpose',
      name: 'Ultimate All-Purpose Cleaner',
      image: 'assets/images/soap.jpeg',
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
      cartName: 'Home Essentials Bundle'
    },
    {
      icon: '🦠',
      name: 'Commercial Bundle',
      savings: 'Save $25',
      items: ['Multi-Surface Soap', 'Disinfectant', 'Professional Bleach', 'Microfiber Cloths (Pack of 12)', 'Streak-Free Glass Cleaner'],
      originalPrice: 196.95,
      bundlePrice: 71.99,
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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.sub = this.productCart.items$.subscribe((items) => {
      this.cartItems = items;
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

  openCheckout(): void {
    if (!this.cartItems.length) {
      return;
    }

    if (!this.isLoggedIn) {
      this.cartOpen = false;
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
      return;
    }

    this.applyProfileToCheckout();
    this.checkoutOpen = true;
    if (!this.cartOpen) {
      this.openCartPanel();
    }
    this.orderPlaced = false;
  }

  closeCheckout(): void {
    this.checkoutOpen = false;
    this.checkoutSubmitted = false;
  }

  submitCheckout(form: NgForm): void {
    this.checkoutSubmitted = true;

    if (form.invalid || !this.cartItems.length) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.cartOpen = false;
      this.router.navigate(['/login']);
      return;
    }

    const payload: OrderPayload = {
      items: this.cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      totals: { total: this.cartTotal, deposit: 0, balance: 0 },
      customer: { ...this.checkoutData }
    };

    this.orderService.submitOrder(payload, token).subscribe({
      next: (res) => {
        this.orderNumber = res.orderId || `FF-${Date.now().toString().slice(-6)}`;
        this.productCart.clear();
        this.cartItems = [];
        this.checkoutOpen = false;
        this.orderPlaced = true;
        this.cartOpen = true;
        this.checkoutSubmitted = false;
        this.checkoutData = { fullName: '', email: '', phone: '', address: '' };
        form.resetForm(this.checkoutData);
      },
      error: () => {
        alert('Order could not be recorded. Please try again.');
      }
    });
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

  private loadCart(): void {
    // kept for compatibility, now handled by ProductCartService
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
