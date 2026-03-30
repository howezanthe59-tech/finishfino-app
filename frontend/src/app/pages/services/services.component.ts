import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  @ViewChild('serviceModal') serviceModalRef?: ElementRef<HTMLElement>;
  @ViewChild('serviceModalClose') serviceModalCloseRef?: ElementRef<HTMLButtonElement>;
  selectedService: any = null;
  serviceModalOpen = false;
  private lastFocusedElement: HTMLElement | null = null;

  services = [
    {
      image: 'assets/images/jani.jpeg',
      alt: 'Janitorial Services',
      title: 'Janitorial Services',
      description: 'Reliable ongoing cleaning solutions for offices, buildings, and facilities.',
      priceLines: [
        'Small Facilities – From $160/month',
        'Medium Facilities – From $383/month',
        'Large Buildings – From $765/month'
      ],
      includes: [
        'Daily restroom cleaning',
        'Garbage removal',
        'Floor care',
        'Dusting',
        'Sanitation of common areas'
      ]
    },
    {
      image: 'assets/images/commerc.jpeg',
      alt: 'Commercial Cleaning',
      title: 'Commercial Cleaning',
      description: 'Maintain a clean and professional environment for your staff and customers.',
      priceLines: [
        'Small Office (1–3 rooms) – $39–$51 per visit',
        'Medium Office (4–8 rooms) – $58–$96 per visit',
        'Large Offices / Retail Spaces – From $102 per visit'
      ],
      includes: [
        'Desk cleaning',
        'Restroom sanitation',
        'Trash removal',
        'Floor cleaning',
        'Surface disinfection'
      ]
    },
    {
      image: 'assets/images/resi.jpeg',
      alt: 'Residential Cleaning',
      title: 'Residential Cleaning',
      description: 'Keep your home fresh, clean, and comfortable with our professional house cleaning service.',
      priceLines: [
        'Standard: 1 Bedroom Apt – $32',
        'Standard: 2 Bedroom Home – $45',
        'Standard: 3 Bedroom Home – $52',
        'Standard: 4+ Bedroom Home – From $64',
        'Deep: 1 Bedroom – $50',
        'Deep: 2 Bedroom – $64',
        'Deep: 3 Bedroom – $77',
        'Deep: 4+ Bedroom – From $93'
      ],
      includes: [
        'Kitchen cleaning',
        'Bathroom sanitation',
        'Dusting',
        'Sweeping & mopping',
        'Trash removal'
      ]
    }
  ];

  constructor() {}

  ngOnInit(): void {}

  openServiceModal(service: any): void {
    this.lastFocusedElement = document.activeElement as HTMLElement | null;
    this.selectedService = service;
    this.serviceModalOpen = true;
    setTimeout(() => {
      this.serviceModalCloseRef?.nativeElement.focus();
    }, 0);
  }

  closeServiceModal(): void {
    this.selectedService = null;
    this.serviceModalOpen = false;
    setTimeout(() => {
      this.lastFocusedElement?.focus();
    }, 0);
  }

  onServiceModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeServiceModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const container = this.serviceModalRef?.nativeElement;
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
}
