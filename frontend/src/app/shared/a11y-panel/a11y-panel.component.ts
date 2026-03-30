import { Component, OnInit, HostListener } from '@angular/core';
import { A11yService, A11ySettings } from '../../services/a11y.service';

@Component({
  selector: 'app-a11y-panel',
  templateUrl: './a11y-panel.component.html',
  styleUrls: ['./a11y-panel.component.css']
})
export class A11yPanelComponent implements OnInit {
  isOpen = false;
  settings: A11ySettings;
  readingGuideTop = 0;

  constructor(public a11yService: A11yService) {
    this.settings = {} as A11ySettings;
  }

  ngOnInit(): void {
    this.a11yService.settings$.subscribe(s => {
      this.settings = s;
    });
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  update(partial: Partial<A11ySettings>): void {
    this.a11yService.updateSettings(partial);
  }

  increaseFont(): void {
    if (this.settings.fontScaleIndex < this.a11yService.fontScales.length - 1) {
      this.update({ fontScaleIndex: this.settings.fontScaleIndex + 1 });
    }
  }

  decreaseFont(): void {
    if (this.settings.fontScaleIndex > 0) {
      this.update({ fontScaleIndex: this.settings.fontScaleIndex - 1 });
    }
  }

  reset(): void {
    this.a11yService.reset();
  }

  get fontScaleLabel(): string {
    return `${Math.round(this.a11yService.fontScales[this.settings.fontScaleIndex] * 100)}%`;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.settings.readingGuide) {
      this.readingGuideTop = event.clientY;
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.settings.readingGuide && event.touches.length > 0) {
      this.readingGuideTop = event.touches[0].clientY;
    }
  }
}
