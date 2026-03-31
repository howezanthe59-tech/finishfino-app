import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  openCookieSettings(event: Event): void {
    event.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ff-open-cookie-popup'));
    }
  }

}
