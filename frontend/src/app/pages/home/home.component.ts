// home.component.ts

import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {

  services = [
    { icon: '🏠', title: 'Residential Cleaning' },
    { icon: '🏢', title: 'Commercial Cleaning' },
    { icon: '🧹', title: 'Janitorial Services' },
  ];

  reasons = [
    'High-quality and reliable service',
    'Trained and insured professionals',
    'Customized cleaning plans',
    'Customer satisfaction guaranteed',
    'Eco-friendly cleaning products',
    'Flexible scheduling options',
  ];

  scrollToContent(): void {
    const services = document.querySelector('.services');
    if (services) {
      services.scrollIntoView({ behavior: 'smooth' });
    }
  }

}
