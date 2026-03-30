// contact.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService, ContactPayload } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  contactForm!: FormGroup;
  submitted = false;
  sending = false;
  successMessage = '';
  errorMessage = '';

  contactMethods = [
    {
      icon: '📧',
      title: 'Email',
      value: 'finishfinocleaningpro@gmail.com',
      href: 'mailto:finishfinocleaningpro@gmail.com',
      detail: null
    },
    {
      icon: '📞',
      title: 'Phone',
      value: '(555) 123-4567',
      href: 'tel:5551234567',
      detail: 'Mon–Fri: 8am – 6pm'
    },
    {
      icon: '📍',
      title: 'Office',
      value: '123 Clean Street, Suite 100, City, State 12345',
      href: null,
      detail: null
    }
  ];

  faqs = [
    {
      question: 'What areas do you serve?',
      answer: 'We proudly serve the entire metropolitan area and surrounding communities. Contact us to confirm service in your specific location.'
    },
    {
      question: 'Do you offer same-day service?',
      answer: 'Yes! Subject to availability, we can often accommodate same-day requests. Call us directly for immediate assistance.'
    },
    {
      question: 'Are your cleaners insured?',
      answer: 'Absolutely. All our cleaning professionals are fully insured, bonded, and background-checked for your peace of mind.'
    },
    {
      question: 'What if I\'m not satisfied?',
      answer: 'We offer a 100% satisfaction guarantee. If you are not happy with our service, we will return to fix it at no extra charge.'
    }
  ];

  constructor(private fb: FormBuilder, private contactService: ContactService) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      name:    ['', [Validators.required, Validators.minLength(2)]],
      email:   ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.contactForm.invalid) return;

    const payload: ContactPayload = {
      name: this.contactForm.value.name,
      email: this.contactForm.value.email,
      message: this.contactForm.value.message,
    };

    this.sending = true;
    this.contactService.sendMessage(payload).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Thank you for contacting us. We will respond shortly.';
        this.contactForm.reset();
        this.submitted = false;
        this.sending = false;
      },
      error: (err) => {
        this.errorMessage = err?.message || 'Something went wrong. Please try again.';
        this.sending = false;
      }
    });
  }

  resetForm(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.submitted = false;
    this.contactForm.reset();
  }

  get f() { return this.contactForm.controls; }
}
