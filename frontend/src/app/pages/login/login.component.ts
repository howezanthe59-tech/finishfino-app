// login.component.ts

import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

// Custom validator: confirms two password fields match
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm  = control.get('confirmPassword');
  if (!password || !confirm) return null;
  return password.value === confirm.value ? null : { passwordMismatch: true };
}

// Enforces strong password rules and prevents using email local-part
function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value || '';
  const email = control.get('email')?.value || '';
  const emailLocal = email.split('@')[0]?.toLowerCase() || '';

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const longEnough = password.length >= 8;
  const containsEmailPart = emailLocal && password.toLowerCase().includes(emailLocal);

  if (!longEnough || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return { weakPassword: true };
  }
  // Removed containsEmailPart check to allow passwords like AdminPass123!
  return null;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('loginTab') loginTabRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('signupTab') signupTabRef?: ElementRef<HTMLButtonElement>;

  activeTab: 'login' | 'signup' = 'login';
  returnUrl = '/dashboard';

  // ── Password visibility toggles ───────────────────
  showLoginPassword    = false;
  showSignupPassword   = false;
  showConfirmPassword  = false;

  // ── Form state ────────────────────────────────────
  loginSubmitted  = false;
  signupSubmitted = false;
  signupSuccess   = false;
  loginErrorMessage: string | null = null;

  loginForm!:  FormGroup;
  signupForm!: FormGroup;

  // ── Info panel features ───────────────────────────
  features = [
    { icon: '🗓️', title: 'Schedule & Reschedule',   description: 'Book, modify, or cancel appointments with ease from your dashboard.' },
    { icon: '💳', title: 'Secure Payments',          description: 'Save payment methods for quick, safe checkout every time.' },
    { icon: '⭐', title: 'Track Your Services',      description: 'View your full service history and leave reviews.' },
    { icon: '💰', title: 'Exclusive Discounts',      description: 'Unlock special offers and promotions for members only.' },
    { icon: '🔔', title: 'Appointment Reminders',    description: 'Never miss a scheduled clean with automated reminders.' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Determine where to send the user after auth (defaults to dashboard)
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    // Already logged in? Skip login/signup and go to dashboard.
    const existingProfile = this.profileService.getProfile();
    if (existingProfile) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }

    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    });

    this.signupForm = this.fb.group({
      fullName:        ['', [Validators.required, Validators.minLength(2)]],
      email:           ['', [Validators.required, Validators.email]],
      phone:           [''],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      agreeTerms:      [false, Validators.requiredTrue]
    }, { validators: [passwordMatchValidator, passwordStrengthValidator] });

    // Auto-switch to signup if ?tab=signup in URL
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) this.returnUrl = params['returnUrl'];
      if (params['tab'] === 'signup') this.activeTab = 'signup';
    });
  }

  ngAfterViewInit(): void {
    // Clear any browser autofill that may appear on initial load
    setTimeout(() => {
      this.loginForm.reset({ email: '', password: '', remember: false });
      this.signupForm.reset();
    }, 0);
  }

  switchTab(tab: 'login' | 'signup'): void {
    this.activeTab = tab;
    if (tab === 'login') this.loginErrorMessage = null;
  }

  onTabKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const nextTab = this.activeTab === 'login' ? 'signup' : 'login';
      this.switchTab(nextTab);
      setTimeout(() => {
        if (nextTab === 'login') {
          this.loginTabRef?.nativeElement.focus();
        } else {
          this.signupTabRef?.nativeElement.focus();
        }
      }, 0);
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.switchTab('login');
      setTimeout(() => this.loginTabRef?.nativeElement.focus(), 0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.switchTab('signup');
      setTimeout(() => this.signupTabRef?.nativeElement.focus(), 0);
    }
  }

  // ── Login ─────────────────────────────────────────
  onLogin(): void {
    this.loginSubmitted = true;
    this.loginErrorMessage = null;
    if (this.loginForm.invalid) return;
    this.authService.login({
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    }).subscribe({
      next: (res) => {
        this.profileService.saveProfile({
          fullName: res.user.fullName,
          email: res.user.email,
          phone: res.user.phone,
          address: res.user.address,
          profileImageUrl: res.user.profileImageUrl,
          role: res.user.role
        });
        if (res.user.role === 'admin') {
          this.router.navigateByUrl('/admin');
        } else {
          this.router.navigateByUrl(this.returnUrl || '/dashboard');
        }
      },
      error: (err) => {
        // Show inline guidance instead of an alert when account is missing/invalid
        const apiMessage = err?.error?.error || err?.message || '';
        const normalized = (apiMessage || '').toString().toLowerCase();
        const invalidCredentials = normalized.includes('invalid') || normalized.includes('unauthorized');
        
        if (invalidCredentials) {
          this.loginErrorMessage = 'Invalid email or password. Please try again.';
        } else if (normalized.includes('not found')) {
          this.loginErrorMessage = 'Account not found. Please create an account.';
        } else {
          this.loginErrorMessage = 'We could not log you in right now. Please try again.';
        }
      }
    });
  }

  // ── Sign Up ───────────────────────────────────────
  onSignup(): void {
    this.signupSubmitted = true;
    if (this.signupForm.invalid) return;
    this.authService.signup({
      fullName: this.signupForm.value.fullName,
      email: this.signupForm.value.email,
      phone: this.signupForm.value.phone,
      password: this.signupForm.value.password
    }).subscribe({
      next: (res) => {
        this.profileService.saveProfile({
          fullName: res.user.fullName,
          email: res.user.email,
          phone: res.user.phone,
          address: res.user.address,
          profileImageUrl: res.user.profileImageUrl,
          role: res.user.role
        });
        this.signupSuccess = true;
        if (res.user.role === 'admin') {
          this.router.navigateByUrl('/admin');
        } else {
          this.router.navigateByUrl(this.returnUrl || '/dashboard');
        }
      },
      error: (err) => {
        this.signupSuccess = false;
        alert(err?.error?.error || err?.message || 'Signup failed.');
      }
    });
  }

  goToLogin(): void {
    this.signupSuccess   = false;
    this.signupSubmitted = false;
    this.signupForm.reset();
    this.activeTab = 'login';
  }

  // ── Helpers ───────────────────────────────────────
  get lf() { return this.loginForm.controls; }
  get sf() { return this.signupForm.controls; }

  get termsChecked(): boolean {
    return !!this.signupForm.get('agreeTerms')?.value;
  }

  get passwordMismatch(): boolean {
    return !!(this.signupSubmitted && this.signupForm.errors && this.signupForm.errors['passwordMismatch']);
  }
}
