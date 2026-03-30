import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService, CustomerProfile } from '../../services/profile.service';
import { ProfileApiService } from '../../services/profile-api.service';
import { BookingService, BookingPayload } from '../../services/booking.service';
import { OrderService, OrderHistoryItem } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  saved = false;
  saving = false;
  errorMessage: string | null = null;
  profile: CustomerProfile | null = null;
  private avatarFile: File | null = null;
  private avatarPreviewUrl: string | null = null;
  private removeAvatarFlag = false;
  bookings: BookingPayload[] = [];
  orders: OrderHistoryItem[] = [];

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private profileApi: ProfileApiService,
    private bookingService: BookingService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const existing = this.profileService.getProfile();
    this.profile = existing;
    this.profileForm = this.fb.group({
      fullName: [existing?.fullName || '', [Validators.required, Validators.minLength(2)]],
      email: [existing?.email || '', [Validators.required, Validators.email]],
      phone: [existing?.phone || ''],
      address: [existing?.address || '']
    });

    const token = this.authService.getToken();
    if (token) {
      this.profileApi.getMe(token).subscribe({
        next: (res) => {
          this.profile = res.user;
          this.profileService.saveProfile(res.user);
          this.profileForm.patchValue({
            fullName: res.user.fullName || '',
            email: res.user.email || '',
            phone: res.user.phone || '',
            address: res.user.address || ''
          });
        },
        error: () => {}
      });

      this.bookingService.getBookingsForCurrentUser(token).subscribe((rows) => {
        this.bookings = rows;
      });
      this.orderService.getOrdersForCurrentUser(token).subscribe((rows) => {
        this.orders = rows;
      });
    }
  }

  ngOnDestroy(): void {
    this.revokeAvatarPreviewUrl();
  }

  get avatarUrl(): string | null {
    if (this.removeAvatarFlag) return null;
    if (this.avatarPreviewUrl) return this.avatarPreviewUrl;
    const url = this.profile?.profileImageUrl || '';
    return url ? url : null;
  }

  get hasAvatar(): boolean {
    if (this.removeAvatarFlag) return false;
    if (this.avatarFile) return true;
    return !!(this.profile?.profileImageUrl && this.profile.profileImageUrl.trim());
  }

  get initials(): string {
    const fullName = String(this.profileForm?.get('fullName')?.value || this.profile?.fullName || '').trim();
    if (!fullName) return 'FF';
    const parts = fullName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    const out = (first + last).toUpperCase();
    return out || 'FF';
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    if (!file) return;

    this.removeAvatarFlag = false;
    this.avatarFile = file;
    this.setAvatarPreviewUrl(file);

    // Allow re-selecting the same file again.
    input.value = '';
  }

  removePhoto(): void {
    this.avatarFile = null;
    this.removeAvatarFlag = true;
    this.revokeAvatarPreviewUrl();
    this.avatarPreviewUrl = null;
  }

  save(): void {
    this.saved = false;
    this.errorMessage = null;
    if (this.profileForm.invalid) return;

    const token = this.authService.getToken();
    if (!token) {
      this.errorMessage = 'You must be logged in to update your profile.';
      return;
    }

    const formData = new FormData();
    formData.append('fullName', String(this.profileForm.value.fullName || '').trim());
    formData.append('email', String(this.profileForm.value.email || '').trim());
    formData.append('phone', String(this.profileForm.value.phone || '').trim());
    formData.append('address', String(this.profileForm.value.address || '').trim());
    if (this.avatarFile) formData.append('avatar', this.avatarFile);
    if (this.removeAvatarFlag) formData.append('removeAvatar', 'true');

    this.saving = true;
    this.profileApi.updateMe(token, formData).subscribe({
      next: (res) => {
        this.profile = res.user;
        this.profileService.saveProfile(res.user);
        this.avatarFile = null;
        this.removeAvatarFlag = false;
        this.revokeAvatarPreviewUrl();
        this.avatarPreviewUrl = null;
        this.profileForm.patchValue({
          fullName: res.user.fullName || '',
          email: res.user.email || '',
          phone: res.user.phone || '',
          address: res.user.address || ''
        });
        this.saving = false;
        this.saved = true;
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || err?.message || 'Failed to update profile.';
      }
    });
  }

  get f() {
    return this.profileForm.controls;
  }

  private setAvatarPreviewUrl(file: File): void {
    this.revokeAvatarPreviewUrl();
    this.avatarPreviewUrl = URL.createObjectURL(file);
  }

  private revokeAvatarPreviewUrl(): void {
    if (this.avatarPreviewUrl && this.avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
    }
  }
}
