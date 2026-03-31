import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { BookingService, BookingPayload } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { OrderService, OrderHistoryItem } from '../../services/order.service';
import { AdminService, AdminUserRow, AdminProductRow } from '../../services/admin.service';

type ProductStatusFilter = 'all' | 'in_stock' | 'out_of_stock';
type ProductModalMode = 'create' | 'edit';
type CustomerSortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';
type OrderStatusFilter = 'all' | 'paid' | 'pending';
type OrderDateFilter = 'all' | 'today' | 'last7';
type OrderSortOption = 'newest' | 'oldest';

interface GroupedOrderStream {
  userKey: string;
  userName: string;
  userEmail: string;
  orders: OrderHistoryItem[];
}

interface AdminProductDraft {
  id?: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  stock_quantity: number | null;
  status: 'in_stock' | 'out_of_stock';
  sku: string;
  image_url?: string | null;
  additional_images: string[];
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('adminTabOverview') adminTabOverviewRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('adminTabBookings') adminTabBookingsRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('adminTabOrders') adminTabOrdersRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('adminTabCustomers') adminTabCustomersRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('adminTabProducts') adminTabProductsRef?: ElementRef<HTMLButtonElement>;
  adminName = '';
  bookings: BookingPayload[] = [];
  orders: OrderHistoryItem[] = [];
  recentBookings: BookingPayload[] = [];
  recentOrders: OrderHistoryItem[] = [];
  users: AdminUserRow[] = [];
  products: AdminProductRow[] = [];
  loading = false;
  loadingOrders = false;
  loadingUsers = false;
  loadingProducts = false;
  savingProduct = false;
  deletingProductId: string | null = null;
  errorMessage: string | null = null;
  ordersError: string | null = null;
  usersError: string | null = null;
  productsError: string | null = null;
  productsSuccess: string | null = null;
  filters = { email: '', userId: '' };
  activeTab: 'overview' | 'bookings' | 'orders' | 'customers' | 'products' = 'overview';
  orderSearchQuery = '';
  orderStatusFilter: OrderStatusFilter = 'all';
  orderDateFilter: OrderDateFilter = 'all';
  orderSort: OrderSortOption = 'newest';
  expandedOrderIds = new Set<string>();
  customerSearchQuery = '';
  customerSort: CustomerSortOption = 'date_desc';
  showTestUsers = false;
  customerPage = 1;
  readonly customerPageSize = 10;

  productQuery = '';
  productCategoryFilter = 'all';
  productStatusFilter: ProductStatusFilter = 'all';
  productPriceMin: number | null = null;
  productPriceMax: number | null = null;
  readonly categoryOptions = [
    'Soap',
    'Bleach',
    'Bundle',
    'Spray',
    'Cloth',
    'Disinfectant',
    'Glass Cleaner'
  ];
  readonly categoryPickerOptions = ['Uncategorized', ...this.categoryOptions];
  private readonly allowedCategorySet = new Set<string>(['Uncategorized', ...this.categoryOptions]);
  categoryEditorProductId: string | null = null;
  categorySavingProductId: string | null = null;

  productModalOpen = false;
  productModalMode: ProductModalMode = 'create';
  productDraft: AdminProductDraft = this.blankProductDraft();
  primaryImageFile: File | null = null;
  primaryImagePreviewUrl: string | null = null;
  newAdditionalImageFiles: File[] = [];
  deleteConfirmOpen = false;
  productPendingDelete: AdminProductRow | null = null;

  constructor(
    private profileService: ProfileService,
    private bookingService: BookingService,
    private authService: AuthService,
    private orderService: OrderService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    const profile = this.profileService.getProfile();
    if (profile) {
      this.adminName = profile.fullName;
    }
    this.loadBookings();
    this.loadOrders();
    this.loadUsers();
    this.loadProducts();
  }

  applyFilters(): void {
    this.loadBookings();
  }

  clearFilters(): void {
    this.filters = { email: '', userId: '' };
    this.loadBookings();
  }

  setTab(tab: 'overview' | 'bookings' | 'orders' | 'customers' | 'products'): void {
    this.activeTab = tab;
  }

  onAdminTabKeydown(event: KeyboardEvent): void {
    const order: Array<'overview' | 'bookings' | 'orders' | 'customers' | 'products'> = [
      'overview',
      'bookings',
      'orders',
      'customers',
      'products'
    ];

    const currentIndex = order.indexOf(this.activeTab);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (currentIndex + delta + order.length) % order.length;
      const nextTab = order[nextIndex];
      this.setTab(nextTab);
      setTimeout(() => this.focusAdminTab(nextTab), 0);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.setTab('overview');
      setTimeout(() => this.focusAdminTab('overview'), 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.setTab('products');
      setTimeout(() => this.focusAdminTab('products'), 0);
    }
  }

  private focusAdminTab(tab: 'overview' | 'bookings' | 'orders' | 'customers' | 'products'): void {
    switch (tab) {
      case 'overview':
        this.adminTabOverviewRef?.nativeElement.focus();
        break;
      case 'bookings':
        this.adminTabBookingsRef?.nativeElement.focus();
        break;
      case 'orders':
        this.adminTabOrdersRef?.nativeElement.focus();
        break;
      case 'customers':
        this.adminTabCustomersRef?.nativeElement.focus();
        break;
      case 'products':
        this.adminTabProductsRef?.nativeElement.focus();
        break;
    }
  }

  statusClass(status: BookingPayload['status']): string {
    switch (status) {
      case 'Completed':
      case 'Balance Paid':
        return 'confirmed';
      case 'Deposit Paid':
        return 'deposit';
      case 'In Progress':
        return 'in-progress';
      default:
        return 'pending';
    }
  }

  private loadBookings(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.bookings = [];
      this.errorMessage = 'Not authenticated.';
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    const filters = {
      email: this.filters.email.trim(),
      userId: this.filters.userId.trim()
    };
    this.bookingService.getBookingsForAdmin(token, filters).subscribe({
      next: (rows) => {
        this.bookings = rows;
        this.recentBookings = this.getRecentBookings(rows);
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load bookings.';
        this.loading = false;
      }
    });
  }

  private loadOrders(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.orders = [];
      this.ordersError = 'Not authenticated.';
      return;
    }
    this.loadingOrders = true;
    this.ordersError = null;
    this.orderService.getOrdersForAdmin(token).subscribe({
      next: (rows) => {
        this.orders = rows;
        this.recentOrders = this.getRecentOrders(rows);
        this.expandedOrderIds.clear();
        this.loadingOrders = false;
      },
      error: () => {
        this.ordersError = 'Failed to load orders.';
        this.loadingOrders = false;
      }
    });
  }

  private loadUsers(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.users = [];
      this.usersError = 'Not authenticated.';
      return;
    }
    this.loadingUsers = true;
    this.usersError = null;
    this.adminService.getUsers(token).subscribe({
      next: (rows) => {
        this.users = rows;
        this.customerPage = 1;
        this.loadingUsers = false;
      },
      error: () => {
        this.usersError = 'Failed to load users.';
        this.loadingUsers = false;
      }
    });
  }

  private loadProducts(): void {
    const token = this.authService.getToken();
    if (!token) {
      this.products = [];
      this.productsError = 'Not authenticated.';
      return;
    }
    this.loadingProducts = true;
    this.productsError = null;
    this.adminService.getProducts(token).subscribe({
      next: (rows) => {
        this.products = rows;
        this.loadingProducts = false;
      },
      error: () => {
        this.productsError = 'Failed to load products.';
        this.loadingProducts = false;
      }
    });
  }

  get filteredProducts(): AdminProductRow[] {
    const q = this.productQuery.trim().toLowerCase();
    const category = this.productCategoryFilter;
    const status = this.productStatusFilter;
    const min = this.productPriceMin != null && Number.isFinite(this.productPriceMin) ? this.productPriceMin : null;
    const max = this.productPriceMax != null && Number.isFinite(this.productPriceMax) ? this.productPriceMax : null;

    return this.products.filter((p) => {
      const nameMatches = !q || (p.name || '').toLowerCase().includes(q);
      const categoryMatches = category === 'all' || this.getCategoryLabel(p.category) === category;
      const statusMatches = status === 'all' || p.status === status;
      const price = (p.price_cents || 0) / 100;
      const minMatches = min == null || price >= min;
      const maxMatches = max == null || price <= max;
      return nameMatches && categoryMatches && statusMatches && minMatches && maxMatches;
    });
  }

  get productCategories(): string[] {
    return ['Uncategorized', ...this.categoryOptions];
  }

  getCategoryLabel(category: string | null | undefined): string {
    const trimmed = (category || '').toString().trim();
    if (!trimmed) return 'Uncategorized';

    const lower = trimmed.toLowerCase();
    if (lower === 'uncategorized') return 'Uncategorized';
    if (lower === 'bundles') return 'Bundle';

    const canonical =
      lower === 'uncategorized'
        ? 'Uncategorized'
        : this.categoryOptions.find((c) => c.toLowerCase() === lower);

    return canonical && this.allowedCategorySet.has(canonical) ? canonical : 'Uncategorized';
  }

  categoryBadgeClass(category: string | null | undefined): string {
    const label = this.getCategoryLabel(category);
    switch (label.toLowerCase()) {
      case 'soap':
        return 'cat-soap';
      case 'bleach':
        return 'cat-bleach';
      case 'bundle':
        return 'cat-bundle';
      case 'spray':
        return 'cat-spray';
      case 'cloth':
        return 'cat-cloth';
      case 'disinfectant':
        return 'cat-disinfectant';
      case 'glass cleaner':
        return 'cat-glass-cleaner';
      default:
        return 'cat-uncategorized';
    }
  }

  toggleCategoryPicker(product: AdminProductRow): void {
    if (this.categorySavingProductId === product.id) return;
    this.productsError = null;
    this.productsSuccess = null;
    this.categoryEditorProductId = this.categoryEditorProductId === product.id ? null : product.id;
  }

  closeCategoryPicker(): void {
    this.categoryEditorProductId = null;
  }

  setProductCategory(product: AdminProductRow, category: string): void {
    const token = this.authService.getToken();
    if (!token) {
      this.productsError = 'Not authenticated.';
      return;
    }

    const next = category.trim();
    const current = this.getCategoryLabel(product.category);
    if (!next || next === current) {
      this.closeCategoryPicker();
      return;
    }

    const previous = product.category;
    product.category = next;
    this.categorySavingProductId = product.id;
    this.closeCategoryPicker();

    this.adminService.updateProductCategory(token, product.id, next).subscribe({
      next: (updated) => {
        const idx = this.products.findIndex((p) => p.id === product.id);
        if (idx !== -1) {
          this.products[idx] = { ...this.products[idx], ...updated };
        }
        this.productsSuccess = 'Category updated.';
        this.categorySavingProductId = null;
      },
      error: (err) => {
        product.category = previous;
        this.productsError = err?.error?.error || 'Invalid category.';
        this.categorySavingProductId = null;
      }
    });
  }

  openCreateProductModal(): void {
    this.productModalMode = 'create';
    this.productDraft = this.blankProductDraft();
    this.primaryImageFile = null;
    this.newAdditionalImageFiles = [];
    this.revokePrimaryPreview();
    this.productModalOpen = true;
    this.productsError = null;
    this.productsSuccess = null;
  }

  openEditProductModal(product: AdminProductRow): void {
    this.productModalMode = 'edit';
    this.productDraft = {
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      price: product.price_cents != null ? product.price_cents / 100 : null,
      category: this.getCategoryLabel(product.category),
      stock_quantity: product.stock_quantity ?? null,
      status: product.status === 'in_stock' ? 'in_stock' : 'out_of_stock',
      sku: product.sku || '',
      image_url: product.image_url || null,
      additional_images: Array.isArray(product.additional_images) ? [...product.additional_images] : []
    };
    this.primaryImageFile = null;
    this.newAdditionalImageFiles = [];
    this.revokePrimaryPreview();
    this.productModalOpen = true;
    this.productsError = null;
    this.productsSuccess = null;
  }

  closeProductModal(): void {
    this.productModalOpen = false;
    this.primaryImageFile = null;
    this.newAdditionalImageFiles = [];
    this.revokePrimaryPreview();
  }

  onPrimaryImageChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    this.primaryImageFile = file;
    this.revokePrimaryPreview();
    if (file) {
      this.primaryImagePreviewUrl = URL.createObjectURL(file);
    }
  }

  onAdditionalImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return;
    this.newAdditionalImageFiles = [...this.newAdditionalImageFiles, ...files];
    if (input) input.value = '';
  }

  removeExistingAdditionalImage(url: string): void {
    this.productDraft.additional_images = this.productDraft.additional_images.filter((u) => u !== url);
  }

  removeNewAdditionalImage(index: number): void {
    this.newAdditionalImageFiles = this.newAdditionalImageFiles.filter((_, i) => i !== index);
  }

  async saveProduct(form: NgForm): Promise<void> {
    if (this.savingProduct) return;
    this.productsError = null;
    this.productsSuccess = null;

    const isCreate = this.productModalMode === 'create';
    const hasImage = !!this.primaryImageFile || !!this.productDraft.image_url;
    if (isCreate && !hasImage) {
      this.productsError = 'Product image is required.';
      return;
    }

    if (form.invalid) {
      this.productsError = 'Please fix the highlighted fields.';
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.productsError = 'Not authenticated.';
      return;
    }

    this.savingProduct = true;

    const payload = {
      id: this.productDraft.id,
      name: this.productDraft.name.trim(),
      description: this.productDraft.description.trim(),
      price: this.productDraft.price,
      category: this.productDraft.category.trim(),
      stock_quantity: this.productDraft.stock_quantity,
      status: this.productDraft.status,
      sku: this.productDraft.sku.trim() || null,
      additional_images_existing: this.productDraft.additional_images
    };

    const request$ = isCreate
      ? this.adminService.createProduct(token, payload, this.primaryImageFile, this.newAdditionalImageFiles)
      : this.adminService.updateProduct(token, payload, this.primaryImageFile, this.newAdditionalImageFiles);

    request$.subscribe({
      next: () => {
        this.productsSuccess = isCreate ? 'Product created.' : 'Product updated.';
        this.closeProductModal();
        this.loadProducts();
        this.savingProduct = false;
      },
      error: (err) => {
        this.productsError = err?.error?.error || 'Failed to save product.';
        this.savingProduct = false;
      }
    });
  }

  requestDeleteProduct(product: AdminProductRow): void {
    this.productPendingDelete = product;
    this.deleteConfirmOpen = true;
    this.productsError = null;
    this.productsSuccess = null;
  }

  cancelDeleteProduct(): void {
    this.deleteConfirmOpen = false;
    this.productPendingDelete = null;
  }

  confirmDeleteProduct(): void {
    if (!this.productPendingDelete) return;

    const token = this.authService.getToken();
    if (!token) {
      this.productsError = 'Not authenticated.';
      return;
    }

    const deletingId = this.productPendingDelete.id;
    this.deletingProductId = deletingId;
    this.deleteConfirmOpen = false;

    this.adminService.deleteProduct(token, deletingId).subscribe({
      next: () => {
        this.productsSuccess = 'Product deleted.';
        this.products = this.products.filter((p) => p.id !== deletingId);
        this.productPendingDelete = null;
        this.deletingProductId = null;
      },
      error: (err) => {
        this.productsError = err?.error?.error || 'Failed to delete product.';
        this.productPendingDelete = null;
        this.deletingProductId = null;
      }
    });
  }

  get totalBookings(): number {
    return this.bookings.length;
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  get totalRevenue(): number {
    return this.orders.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  get pendingBookings(): number {
    return this.bookings.filter((b) => this.isPending(b.status)).length;
  }

  get filteredOrders(): OrderHistoryItem[] {
    const query = this.orderSearchQuery.trim().toLowerCase();
    const usersById = this.buildUsersById();
    const startOfToday = this.startOfToday();
    const last7Start = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const visible = this.orders.filter((order) => {
      const statusMatches = this.matchesOrderStatus(order);
      if (!statusMatches) return false;

      const createdAt = this.parseDate(order.createdAt);
      if (this.orderDateFilter === 'today' && (createdAt <= 0 || createdAt < startOfToday)) return false;
      if (this.orderDateFilter === 'last7' && (createdAt <= 0 || createdAt < last7Start)) return false;

      if (!query) return true;

      const orderId = (order.id || '').toLowerCase();
      const userId = String(order.userId || '').trim();
      const user = userId ? usersById.get(userId) : undefined;
      const email = (user?.email || '').toLowerCase();
      const normalizedUserId = userId.toLowerCase();

      return orderId.includes(query) || email.includes(query) || normalizedUserId.includes(query);
    });

    return [...visible].sort((a, b) => {
      if (this.orderSort === 'oldest') {
        return this.parseDate(a.createdAt) - this.parseDate(b.createdAt);
      }
      return this.parseDate(b.createdAt) - this.parseDate(a.createdAt);
    });
  }

  get groupedOrders(): GroupedOrderStream[] {
    const usersById = this.buildUsersById();
    const groups = new Map<string, GroupedOrderStream>();

    for (const order of this.filteredOrders) {
      const userId = String(order.userId || '').trim();
      const user = userId ? usersById.get(userId) : undefined;
      const email = (user?.email || '').trim();
      const name = (user?.full_name || '').trim();
      const shortId = this.shortenIdentifier(userId);

      const key = userId || email || `unknown-${this.shortenIdentifier(order.id)}`;
      const userName = name || (email ? email.split('@')[0] : `User ${shortId || 'unknown'}`);
      const userEmail = email || (shortId ? `ID: ${shortId}` : 'ID unavailable');

      if (!groups.has(key)) {
        groups.set(key, {
          userKey: key,
          userName,
          userEmail,
          orders: []
        });
      }

      groups.get(key)!.orders.push(order);
    }

    return Array.from(groups.values());
  }

  onOrderFiltersChanged(): void {
    this.expandedOrderIds.clear();
  }

  toggleOrderExpanded(orderId: string): void {
    if (!orderId) return;
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  isOrderExpanded(orderId: string): boolean {
    return this.expandedOrderIds.has(orderId);
  }

  isPaidOrder(status?: string | null): boolean {
    const normalized = (status || '').toLowerCase();
    return normalized.includes('paid') && !normalized.includes('pending') && !normalized.includes('fail');
  }

  getOrderStatusLabel(status?: string | null): string {
    return this.isPaidOrder(status) ? 'Paid' : 'Pending';
  }

  orderStatusClass(status?: string | null): string {
    return this.isPaidOrder(status) ? 'order-status-paid' : 'order-status-pending';
  }

  shortOrderId(orderId?: string | null): string {
    return this.shortenIdentifier(orderId);
  }

  formatPaymentMethod(order: OrderHistoryItem): string {
    const accountType = (order.paymentAccountType || 'Account').trim();
    const last4 = String(order.paymentAccountLast4 || '').replace(/\D/g, '').slice(-4);
    return last4 ? `${accountType} - ****${last4}` : accountType;
  }

  get filteredUsers(): AdminUserRow[] {
    const query = this.customerSearchQuery.trim().toLowerCase();

    const visible = this.users.filter((user) => {
      if (!this.showTestUsers && this.isTestUser(user)) return false;
      if (!query) return true;

      const name = (user.full_name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });

    return [...visible].sort((a, b) => {
      switch (this.customerSort) {
        case 'name_asc':
          return (a.full_name || '').localeCompare((b.full_name || ''), undefined, { sensitivity: 'base' });
        case 'name_desc':
          return (b.full_name || '').localeCompare((a.full_name || ''), undefined, { sensitivity: 'base' });
        case 'date_asc':
          return this.parseDate(a.created_at) - this.parseDate(b.created_at);
        case 'date_desc':
        default:
          return this.parseDate(b.created_at) - this.parseDate(a.created_at);
      }
    });
  }

  get pagedUsers(): AdminUserRow[] {
    const users = this.filteredUsers;
    const current = this.customerCurrentPage;
    const start = (current - 1) * this.customerPageSize;
    return users.slice(start, start + this.customerPageSize);
  }

  get customerTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.customerPageSize));
  }

  get customerCurrentPage(): number {
    return Math.min(Math.max(1, this.customerPage), this.customerTotalPages);
  }

  onCustomerFiltersChanged(): void {
    this.customerPage = 1;
  }

  goToPreviousCustomerPage(): void {
    if (this.customerPage > 1) {
      this.customerPage -= 1;
    }
  }

  goToNextCustomerPage(): void {
    if (this.customerPage < this.customerTotalPages) {
      this.customerPage += 1;
    }
  }

  private isTestUser(user: AdminUserRow): boolean {
    const email = (user.email || '').toLowerCase();
    if (email.includes('example.com')) return true;

    const fullName = (user.full_name || '').toLowerCase();
    return fullName.includes('test') || fullName.includes('smoke') || fullName.includes('cookie');
  }

  private isPending(status?: string | null): boolean {
    const normalized = (status || '').toString().toLowerCase();
    return normalized.includes('pending');
  }

  private matchesOrderStatus(order: OrderHistoryItem): boolean {
    if (this.orderStatusFilter === 'all') return true;
    const paid = this.isPaidOrder(order.status);
    if (this.orderStatusFilter === 'paid') return paid;
    return !paid;
  }

  private getRecentBookings(rows: BookingPayload[]): BookingPayload[] {
    return [...rows]
      .sort((a, b) => this.parseDate(b.date) - this.parseDate(a.date))
      .slice(0, 5);
  }

  private getRecentOrders(rows: OrderHistoryItem[]): OrderHistoryItem[] {
    return [...rows]
      .sort((a, b) => this.parseDate(b.createdAt) - this.parseDate(a.createdAt))
      .slice(0, 5);
  }

  private parseDate(value?: string): number {
    if (!value) return 0;
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? 0 : ts;
  }

  private shortenIdentifier(value?: string | null, length = 8): string {
    const raw = String(value || '').trim();
    return raw ? raw.slice(0, length) : '';
  }

  private startOfToday(): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }

  private buildUsersById(): Map<string, AdminUserRow> {
    return new Map(
      this.users.map((user) => [String(user.id || '').trim(), user])
    );
  }

  private blankProductDraft(): AdminProductDraft {
    return {
      name: '',
      description: '',
      price: null,
      category: 'Uncategorized',
      stock_quantity: 0,
      status: 'in_stock',
      sku: '',
      image_url: null,
      additional_images: []
    };
  }

  private revokePrimaryPreview(): void {
    if (this.primaryImagePreviewUrl) {
      URL.revokeObjectURL(this.primaryImagePreviewUrl);
      this.primaryImagePreviewUrl = null;
    }
  }
}
