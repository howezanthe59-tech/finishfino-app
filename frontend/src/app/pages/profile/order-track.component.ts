import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrderService, OrderTrackingDetails } from '../../services/order.service';

@Component({
  selector: 'app-order-track',
  templateUrl: './order-track.component.html',
  styleUrls: ['./order-track.component.css']
})
export class OrderTrackComponent implements OnInit {
  loading = true;
  errorMessage: string | null = null;
  order: OrderTrackingDetails | null = null;

  readonly steps = [
    'Order Placed',
    'Confirmed',
    'Processing',
    'Shipped',
    'Delivered'
  ];

  currentStepIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const orderId = String(this.route.snapshot.paramMap.get('id') || '').trim();
    const token = this.authService.getToken();

    if (!orderId) {
      this.loading = false;
      this.errorMessage = 'Order id is missing.';
      return;
    }

    if (!token) {
      this.loading = false;
      this.errorMessage = 'You must be logged in to track an order.';
      return;
    }

    this.orderService.getOrderById(orderId, token).subscribe((row) => {
      this.loading = false;
      if (!row) {
        this.errorMessage = 'Order not found.';
        return;
      }
      this.order = row;
      this.currentStepIndex = this.toStepIndex(row.order_status);
    });
  }

  getStatusLabel(status?: string | null): string {
    const raw = (status || '').toString().trim();
    if (!raw) return 'Pending';
    return raw
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((part) => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : '')
      .join(' ');
  }

  isStepComplete(index: number): boolean {
    return index <= this.currentStepIndex;
  }

  isCurrentStep(index: number): boolean {
    return index === this.currentStepIndex;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private toStepIndex(statusRaw?: string | null): number {
    const status = (statusRaw || '').toString().trim().toLowerCase();
    if (status === 'delivered' || status === 'completed') return 4;
    if (status === 'shipped' || status === 'out_for_delivery') return 3;
    if (status === 'processing' || status === 'in_progress' || status === 'packed') return 2;
    if (status === 'confirmed' || status === 'approved' || status === 'paid') return 1;
    return 0;
  }
}
