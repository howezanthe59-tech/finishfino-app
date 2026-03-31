import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (!password || !confirm) return null;
  return password.value === confirm.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  submitted = false;
  submitting = false;
  token = '';
  successMessage: string | null = null;
  errorMessage: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = String(this.route.snapshot.queryParamMap.get('token') || '').trim();
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });

    if (!this.token) {
      this.errorMessage = 'Reset link is invalid or missing token. Please request a new password reset email.';
    }
  }

  get f() {
    return this.resetForm.controls;
  }

  get passwordMismatch(): boolean {
    return !!(this.submitted && this.resetForm.errors?.['passwordMismatch']);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.token) {
      this.errorMessage = 'Reset link is invalid or expired. Please request a new one.';
      return;
    }

    if (this.resetForm.invalid) return;

    this.submitting = true;
    this.authService.resetPassword({
      token: this.token,
      new_password: this.resetForm.value.password
    }).subscribe({
      next: () => {
        this.successMessage = 'Password updated successfully. You can now log in.';
        this.submitting = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.error ||
          err?.error?.message ||
          'Unable to reset password right now. Please request a new reset link.';
        this.submitting = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
