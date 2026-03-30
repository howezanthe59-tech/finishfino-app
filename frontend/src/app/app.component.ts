import { Component, OnInit } from '@angular/core';
import { A11yService } from './services/a11y.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(private a11yService: A11yService) {}

  ngOnInit(): void {
    // A11yService handles its own initialization and effect application
  }
}
