// terms.component.ts

import { Component } from '@angular/core';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  subsections?: { heading: string; paragraphs?: string[]; items?: string[] }[];
}

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.css']
})
export class TermsComponent {

  lastUpdated = 'January 30, 2026';

  sections: LegalSection[] = [
    {
      heading: '1. Acceptance of Terms',
      paragraphs: [
        'By accessing and using the FinishFino Cleaning Pros website and services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms, please do not use our services.'
      ]
    },
    {
      heading: '2. Services Provided',
      paragraphs: [
        'FinishFino Cleaning Pros provides professional cleaning services including but not limited to:',
        'All services are subject to availability and our discretion to accept or decline service requests.'
      ],
      items: [
        'Residential cleaning services',
        'Commercial cleaning services',
        'Janitorial services',
        'Sale of cleaning products and supplies'
      ]
    },
    {
      heading: '3. Booking and Payment',
      subsections: [
        {
          heading: '3.1 Service Booking',
          paragraphs: ['When you book a cleaning service, you agree to provide accurate and complete information. We reserve the right to cancel or refuse any booking at our discretion.']
        },
        {
          heading: '3.2 Payment Terms',
          paragraphs: ['Payment is due upon completion of services unless otherwise agreed in writing. We accept major credit cards, debit cards, and other payment methods as indicated on our website. All prices are in USD and are subject to applicable taxes.']
        },
        {
          heading: '3.3 Product Purchases',
          paragraphs: ['All product purchases are final upon checkout. Prices for products are subject to change without notice. We reserve the right to limit quantities purchased.']
        }
      ]
    },
    {
      heading: '4. Cancellation and Rescheduling',
      subsections: [
        {
          heading: '4.1 Customer Cancellations',
          paragraphs: ['Customers may cancel or reschedule services with at least 24 hours\' notice without penalty. Cancellations made with less than 24 hours\' notice may be subject to a cancellation fee of up to 50% of the service cost.']
        },
        {
          heading: '4.2 Our Right to Cancel',
          paragraphs: ['We reserve the right to cancel or reschedule services due to weather conditions, staff availability, or other unforeseen circumstances. In such cases, we will notify you as soon as possible and offer to reschedule at no additional cost.']
        }
      ]
    },
    {
      heading: '5. Customer Responsibilities',
      paragraphs: ['As a customer, you agree to:'],
      items: [
        'Provide safe and unobstructed access to areas requiring cleaning',
        'Secure or remove valuable, fragile, or irreplaceable items',
        'Inform us of any hazardous conditions or special requirements',
        'Ensure pets are secured during service',
        'Provide accurate contact information and service location details',
        'Be present or arrange for access to the property during scheduled service times'
      ]
    },
    {
      heading: '6. Liability and Insurance',
      subsections: [
        {
          heading: '6.1 Our Insurance',
          paragraphs: ['FinishFino Cleaning Pros maintains general liability insurance. Our cleaning professionals are fully insured and bonded for your protection.']
        },
        {
          heading: '6.2 Limitation of Liability',
          paragraphs: [
            'We take great care in providing our services. However, we are not liable for:',
            'In the event of damage caused by our negligence, our liability is limited to the cost of the service or repair/replacement of the damaged item, whichever is less, up to a maximum of $1,000 per incident.'
          ],
          items: [
            'Pre-existing damage to property or items',
            'Damage to items not properly secured or identified as fragile',
            'Damage resulting from customer negligence or failure to follow instructions',
            'Indirect, incidental, or consequential damages',
            'Items valued over $500 unless specifically declared in writing prior to service'
          ]
        }
      ]
    },
    {
      heading: '7. Satisfaction Guarantee',
      paragraphs: ['We strive for 100% customer satisfaction. If you are not satisfied with our cleaning service, please contact us within 24 hours of service completion. We will return to re-clean any areas of concern at no additional charge. This guarantee applies to cleaning services only and does not apply to product purchases.']
    },
    {
      heading: '8. Product Returns and Refunds',
      subsections: [
        {
          heading: '8.1 Product Returns',
          paragraphs: ['Products may be returned within 30 days of purchase if unopened and in original packaging. Opened products cannot be returned for health and safety reasons unless defective.']
        },
        {
          heading: '8.2 Refund Process',
          paragraphs: ['Approved returns will be refunded to the original payment method within 7-10 business days. Shipping costs are non-refundable unless the return is due to our error or a defective product.']
        }
      ]
    },
    {
      heading: '9. Intellectual Property',
      paragraphs: ['All content on this website, including text, graphics, logos, images, and software, is the property of FinishFino Cleaning Pros and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works from our content without express written permission.']
    },
    {
      heading: '10. Privacy and Data Protection',
      paragraphs: ['Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our services, you consent to our privacy practices as described in the Privacy Policy.']
    },
    {
      heading: '11. User Conduct',
      paragraphs: ['You agree not to:'],
      items: [
        'Use our services for any illegal or unauthorized purpose',
        'Harass, abuse, or harm our employees or other customers',
        'Attempt to gain unauthorized access to our systems',
        'Transmit viruses, malware, or other harmful code',
        'Impersonate any person or entity',
        'Interfere with or disrupt our services or servers'
      ]
    },
    {
      heading: '12. Third-Party Links',
      paragraphs: ['Our website may contain links to third-party websites. We are not responsible for the content, privacy policies, or practices of third-party sites. We recommend reviewing the terms and privacy policies of any third-party websites you visit.']
    },
    {
      heading: '13. Modifications to Terms',
      paragraphs: ['We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services after changes are posted constitutes acceptance of the modified Terms. We encourage you to review these Terms periodically.']
    },
    {
      heading: '14. Dispute Resolution',
      subsections: [
        {
          heading: '14.1 Informal Resolution',
          paragraphs: ['In the event of any dispute, claim, or controversy, you agree to contact us first to attempt to resolve the matter informally by contacting our customer service team.']
        },
        {
          heading: '14.2 Binding Arbitration',
          paragraphs: ['If we cannot resolve a dispute informally, any remaining dispute will be resolved through binding arbitration rather than in court, except that you may assert claims in small claims court if your claims qualify.']
        },
        {
          heading: '14.3 Class Action Waiver',
          paragraphs: ['You agree that any arbitration or proceeding shall be limited to the dispute between you and FinishFino Cleaning Pros individually. You waive any right to participate in any class action or class-wide arbitration.']
        }
      ]
    },
    {
      heading: '15. Governing Law',
      paragraphs: ['These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which FinishFino Cleaning Pros operates, without regard to its conflict of law provisions.']
    },
    {
      heading: '16. Severability',
      paragraphs: ['If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.']
    },
    {
      heading: '17. Contact Information',
      paragraphs: ['If you have any questions about these Terms and Conditions, please contact us:']
    }
  ];

  relatedLinks = [
    { route: '/privacy', icon: '🔒', title: 'Privacy Policy',  description: 'Learn how we collect, use, and protect your personal information' },
    { route: '/contact', icon: '📧', title: 'Contact Us',      description: 'Have questions? Get in touch with our team' },
    { route: '/book',    icon: '📅', title: 'Book a Service',  description: 'Ready to schedule your cleaning service?' }
  ];
}
