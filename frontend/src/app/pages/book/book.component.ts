import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { BookingService, BookingPayload } from '../../services/booking.service';
import { BookingCartService, BookingCartItem } from '../../services/booking-cart.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { Router } from '@angular/router';

type PricingMatrix = Record<string, number>;

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.css']
})
export class BookComponent implements OnInit {
  bookingForm!: FormGroup;
  currentStep = 1;
  totalSteps = 6;
  modalOpen = false;
  checkoutMode = false;
  submitted = false;
  total = 0;
  deposit = 0;
  balance = 0;
  cartItems: BookingCartItem[] = [];
  lastConfirmation = '';
  pricing: PricingMatrix = {
    base_residential: 140,
    base_commercial: 200,
    base_janitorial: 175,
    bedroom: 25,
    bathroom: 20,
    sqft_per_100: 12
  };
  addOnPrices: PricingMatrix = {
    inside_fridge: 35,
    inside_oven: 30,
    laundry: 25,
    windows: 40,
    deep_clean: 60,
    pets: 20
  };
  productOptions = [
    'ProClean Multi-Surface Soap',
    'Disinfectant',
    'Professional Strength Bleach',
    'Premium Microfiber Cloths',
    'Fresh Linen Home Spray',
    'Lavender Dreams Home Spray',
    'Citrus Burst Home Spray',
    'Streak-Free Glass Cleaner',
    'Ultimate All-Purpose Cleaner',
    // Bundles
    'Home Essentials Bundle',
    'Commercial Bundle',
    'Fresh Space Bundle'
  ];
  productPrices: Record<string, number> = {
    'ProClean Multi-Surface Soap': 24.99,
    'Disinfectant': 18.99,
    'Professional Strength Bleach': 12.99,
    'Premium Microfiber Cloths': 16.99,
    'Fresh Linen Home Spray': 14.99,
    'Lavender Dreams Home Spray': 14.99,
    'Citrus Burst Home Spray': 14.99,
    'Streak-Free Glass Cleaner': 11.99,
    'Ultimate All-Purpose Cleaner': 22.99,
    'Home Essentials Bundle': 73.99,
    'Commercial Bundle': 71.99,
    'Fresh Space Bundle': 75.99
  };

  parishCities: Record<string, string[]> = {
    'Kingston': ['Kingston'],
    'St. Andrew': ['Half Way Tree', 'Stony Hill', 'Cross Roads', 'Gordon Town', 'Papine', 'Red Hills'],
    'St. Thomas': ['Morant Bay', 'Yallahs', 'Bath', 'Seaforth', 'Port Morant'],
    'Portland': ['Port Antonio', 'Buff Bay', 'Hope Bay', 'Manchioneal'],
    'St. Mary': ['Port Maria', 'Annotto Bay', 'Highgate', 'Oracabessa', 'Richmond'],
    'St. Ann': ['St. Ann\'s Bay', 'Ocho Rios', 'Brown\'s Town', 'Runaway Bay', 'Discovery Bay', 'Claremont'],
    'Trelawny': ['Falmouth', 'Albert Town', 'Clark\'s Town', 'Duncans', 'Wakefield'],
    'St. James': ['Montego Bay', 'Cambridge', 'Adelphi', 'Anchovy'],
    'Hanover': ['Lucea', 'Green Island', 'Hopewell'],
    'Westmoreland': ['Savanna-la-Mar', 'Negril', 'Grange Hill', 'Petersfield', 'Bluefields'],
    'St. Elizabeth': ['Black River', 'Santa Cruz', 'Malvern', 'Junction', 'Balaclava'],
    'Manchester': ['Mandeville', 'Christiana', 'Porus', 'Newport', 'Cross Keys'],
    'Clarendon': ['May Pen', 'Chapelton', 'Frankfield', 'Lionel Town', 'Hayes', 'Kellits'],
    'St. Catherine': ['Spanish Town', 'Portmore', 'Linstead', 'Old Harbour', 'Bog Walk', 'Ewarton']
  };
  parishes: string[] = Object.keys(this.parishCities);
  availableCities: string[] = [];

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private bookingCart: BookingCartService,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const profile = this.profileService.getProfile();

    // Mandate login for booking
    if (!profile) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/book' } });
      return;
    }

    const profileEmail = profile?.email || '';
    const profileName  = profile?.fullName || '';
    const profilePhone = profile?.phone || '';

    this.bookingForm = this.fb.group({
      fullName: [
        profileName,
        [
          Validators.required,
          Validators.minLength(2),
          (control: AbstractControl): ValidationErrors | null => {
            if (!profileName || !control.value) return null;
            return control.value.trim().toLowerCase() === profileName.trim().toLowerCase()
              ? null
              : { detailMismatch: true };
          }
        ]
      ],
      email: [
        profileEmail,
        [
          Validators.required,
          Validators.email,
          (control: AbstractControl): ValidationErrors | null => {
            if (!profileEmail || !control.value) return null;
            return control.value.trim().toLowerCase() === profileEmail.trim().toLowerCase()
              ? null
              : { detailMismatch: true };
          }
        ]
      ],
      phone: [
        profilePhone,
        [
          Validators.required,
          (control: AbstractControl): ValidationErrors | null => {
            if (!profilePhone || !control.value) return null;
            // Basic normalization for comparison
            const clean = (s: string) => s.replace(/\D/g, '');
            return clean(control.value) === clean(profilePhone)
              ? null
              : { detailMismatch: true };
          }
        ]
      ],
      street: ['', Validators.required],
      unit: [''],
      city: ['', Validators.required],
      parish: ['', Validators.required],
      serviceType: ['', Validators.required],
      cleaningLevel: ['standard'],
      serviceSize: ['small'],
      productSelection: [[], Validators.required],
      propertyType: ['house', Validators.required],
      bedrooms: [1, [Validators.required, Validators.min(0)]],
      bathrooms: [1, [Validators.required, Validators.min(0)]],
      sizeSqft: [null],
      date: ['', Validators.required],
      time: ['', Validators.required],
      instructions: [''],
      addOns: this.fb.group({
        inside_fridge: [false],
        inside_oven: [false],
        laundry: [false],
        windows: [false],
        deep_clean: [false],
        pets: [false]
      })
    });

    this.bookingForm.get('parish')?.valueChanges.subscribe(parish => {
      this.availableCities = this.parishCities[parish] || [];
      this.bookingForm.get('city')?.setValue(''); // reset specific city when parish switches
    });

    this.bookingForm.valueChanges.subscribe(() => this.recalculate());
    this.cartItems = this.bookingCart.getAll();
    this.recalculate();
  }

  isStepValid(step: number): boolean {
    const f = this.bookingForm.controls;
    switch (step) {
      case 1:
        return f['fullName'].valid && f['email'].valid && f['phone'].valid;
      case 2:
        return f['street'].valid && f['city'].valid && f['parish'].valid;
      case 3:
        return f['serviceType'].valid && f['propertyType'].valid && f['bedrooms'].valid && f['bathrooms'].valid;
      case 4:
        return f['date'].valid && f['time'].valid;
      case 5:
        return f['productSelection'].valid;
      case 6:
        return this.bookingForm.valid; // review step needs everything
      default:
        return false;
    }
  }

  nextStep(): void {
    this.submitted = true; // show validation errors for current step
    if (this.isStepValid(this.currentStep)) {
      this.submitted = false; // reset for next step
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  prevStep(): void {
    this.submitted = false;
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number): void {
    if (step < this.currentStep || this.isStepValid(this.currentStep)) {
      this.currentStep = step;
      this.submitted = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  beginNewBooking(): void {
    this.currentStep = 1;
    this.modalOpen = false;
    this.checkoutMode = false;
    this.submitted = false;
    this.lastConfirmation = '';
    this.balance = 0;
    
    this.bookingForm.reset({
      propertyType: 'house',
      bedrooms: 1,
      bathrooms: 1,
      cleaningLevel: 'standard',
      serviceSize: 'small'
    });
    this.recalculate();
  }

  recalculate(): void {
    const v = this.bookingForm.value;
    if (!v) return;

    // Require essentials before showing totals
    if (
      !v.serviceType ||
      !(v.productSelection && v.productSelection.length) ||
      !v.fullName ||
      !v.email ||
      !v.street ||
      !v.city ||
      !v.parish
    ) {
      this.total = 0;
      this.deposit = 0;
      this.balance = 0;
      return;
    }

    let base = 0;
    // Service-specific pricing (exactly as displayed)
    if (v.serviceType === 'residential') {
      const beds = Number(v.bedrooms) || 1;
      const level = v.cleaningLevel || 'standard';
      if (level === 'standard') {
        if (beds <= 1) base = 32;
        else if (beds === 2) base = 45;
        else if (beds === 3) base = 52;
        else base = 64;
      } else {
        if (beds <= 1) base = 50;
        else if (beds === 2) base = 64;
        else if (beds === 3) base = 77;
        else base = 93;
      }
    } else if (v.serviceType === 'commercial') {
      const size = v.serviceSize || 'small';
      if (size === 'small') base = 45;           // midpoint of $39–$51
      else if (size === 'medium') base = 77;     // midpoint of $58–$96
      else base = 110;                           // from $102+
    } else if (v.serviceType === 'janitorial') {
      const size = v.serviceSize || 'small';
      if (size === 'small') base = 160;
      else if (size === 'medium') base = 383;
      else base = 765;
    }

    let addOnsTotal = 0;
    Object.keys(this.addOnPrices).forEach((key) => {
      if (v.addOns?.[key]) addOnsTotal += this.addOnPrices[key];
    });

    let productsTotal = 0;
    (v.productSelection || []).forEach((p: string) => {
      productsTotal += this.productPrices[p] || 0;
    });

    const total = base + addOnsTotal + productsTotal;

    this.total = Math.max(total, 75); // ensure floor
    this.deposit = 0; // Deposit removed per user request
    this.balance = parseFloat(this.total.toFixed(2));
  }

  beginCheckout(): void {
    this.submitted = true;
    if (this.bookingForm.invalid) return;
    this.checkoutMode = true;
  }

  confirmAndPayDeposit(): void {
    this.submitted = true;
    if (this.bookingForm.invalid) return;

    const token = this.authService.getToken() || null;

    const payload: BookingPayload = {
      fullName: this.bookingForm.value.fullName,
      email: this.bookingForm.value.email,
      phone: this.bookingForm.value.phone,
      address: this.formatAddress(),
      serviceType: this.bookingForm.value.serviceType,
      cleaningLevel: this.bookingForm.value.cleaningLevel,
      serviceSize: this.bookingForm.value.serviceSize,
      productSelection: this.bookingForm.value.productSelection || [],
      propertyType: this.bookingForm.value.propertyType,
      bedrooms: Number(this.bookingForm.value.bedrooms) || 0,
      bathrooms: Number(this.bookingForm.value.bathrooms) || 0,
      sizeSqft: this.bookingForm.value.sizeSqft ? Number(this.bookingForm.value.sizeSqft) : null,
      date: this.bookingForm.value.date,
      time: this.bookingForm.value.time,
      instructions: this.bookingForm.value.instructions,
      addOns: Object.keys(this.addOnPrices).filter((k) => this.bookingForm.value.addOns?.[k]),
      total: this.total,
      deposit: this.deposit,
      balance: this.balance,
      status: 'Pending'
    };

    this.bookingService.submitBooking(payload, token).subscribe(() => {
      this.bookingCart.add(payload);
      this.cartItems = this.bookingCart.getAll();
      this.lastConfirmation = 'Your booking request has been successfully submitted! We will contact you soon with confirmation and payment options.';
      this.checkoutMode = false;
      this.submitted = false;
      this.bookingForm.reset({
        propertyType: 'house',
        bedrooms: 1,
        bathrooms: 1
      });
      this.recalculate();
    });
  }

  toggleProduct(product: string): void {
    const control = this.bookingForm.get('productSelection');
    if (!control) return;
    const current: string[] = control.value ? [...control.value] : [];
    const idx = current.indexOf(product);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(product);
    }
    control.setValue(current);
    control.markAsDirty();
  }

  get f() {
    return this.bookingForm.controls;
  }

  get selectedProducts(): { name: string; price: number }[] {
    const list: string[] = this.bookingForm.value.productSelection || [];
    return list.map((p) => ({ name: p, price: this.productPrices[p] || 0 }));
  }

  get selectedAddOns(): { name: string; price: number }[] {
    const v = this.bookingForm.value;
    const results: { name: string; price: number }[] = [];
    Object.keys(this.addOnPrices).forEach((key) => {
      if (v.addOns?.[key]) results.push({ name: this.addOnLabel(key), price: this.addOnPrices[key] });
    });
    return results;
  }

  private addOnLabel(key: string): string {
    const labels: Record<string, string> = {
      inside_fridge: 'Inside fridge',
      inside_oven: 'Inside oven',
      laundry: 'Laundry',
      windows: 'Windows',
      deep_clean: 'Deep clean focus',
      pets: 'Pet hair extra'
    };
    return labels[key] || key;
  }

  private formatAddress(): string {
    const street = this.bookingForm.value.street || '';
    const unit = this.bookingForm.value.unit ? `${this.bookingForm.value.unit}, ` : '';
    const city = this.bookingForm.value.city || '';
    const parish = this.bookingForm.value.parish || '';
    return `${street}, ${unit}${city}, ${parish}`.replace(/\s+,/g, ',').replace(/,\s*,/g, ', ');
  }
}
