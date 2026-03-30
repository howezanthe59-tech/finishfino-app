// about.component.ts

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit {

  // Tracks which flip card is currently flipped (by index)
  flippedCard: number | null = null;

  services = [
    {
      image: 'assets/images/resident.jpeg',
      alt: 'Residential Cleaning',
      title: 'Residential Cleaning',
      icon: '🏠',
      description: 'We provide thorough home cleaning that leaves every room sparkling and hygienic. From routine maintenance to deep cleaning, we handle it all.'
    },
    {
      image: 'assets/images/commmericial.jpeg',
      alt: 'Commercial Cleaning',
      title: 'Commercial Cleaning',
      icon: '🏢',
      description: 'Professional office and business cleaning services to maintain a healthy work environment. We work around your schedule to minimize disruption.'
    },
    {
      image: 'assets/images/janito.jpeg',
      alt: 'Janitorial Services',
      title: 'Janitorial Services',
      icon: '🧹',
      description: 'Reliable daily, weekly, or customized janitorial services for commercial facilities. Consistent quality you can count on.'
    }
  ];

  values = [
    {
      title: 'Quality First',
      description: 'We never compromise on the quality of our work. Every job is completed to the highest standards.'
    },
    {
      title: 'Trust & Reliability',
      description: 'Our team is fully vetted, insured, and trained to provide services you can trust.'
    },
    {
      title: 'Customer Focus',
      description: 'Your satisfaction is our priority. We listen to your needs and exceed expectations.'
    },
    {
      title: 'Eco-Friendly',
      description: 'We use environmentally responsible products that are safe for your family and pets.'
    }
  ];

  constructor() { }

  ngOnInit(): void { }

  toggleFlip(index: number): void {
    this.flippedCard = this.flippedCard === index ? null : index;
  }

  isFlipped(index: number): boolean {
    return this.flippedCard === index;
  }

}
