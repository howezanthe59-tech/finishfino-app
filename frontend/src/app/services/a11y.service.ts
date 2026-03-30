import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface A11ySettings {
  fontScaleIndex: number;
  fontFamily: 'standard' | 'dyslexic';
  spacing: 'normal' | 'relaxed' | 'wide';
  darkMode: boolean;
  highContrast: boolean;
  invertColors: boolean;
  lowBrightness: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  bigCursor: boolean;
  simplifyLayout: boolean;
  readingGuide: boolean;
  reduceMotion: boolean;
  bigButtons: boolean;
  muteAll: boolean;
}

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  fontScaleIndex: 1,
  fontFamily: 'standard',
  spacing: 'normal',
  darkMode: false,
  highContrast: false,
  invertColors: false,
  lowBrightness: false,
  highlightLinks: false,
  highlightHeadings: false,
  bigCursor: false,
  simplifyLayout: false,
  readingGuide: false,
  reduceMotion: false,
  bigButtons: false,
  muteAll: false
};

const STORAGE_KEY = 'finishfino_a11y_settings';

@Injectable({
  providedIn: 'root'
})
export class A11yService {
  private settingsSubject = new BehaviorSubject<A11ySettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  fontScales = [0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.5];

  constructor() {
    this.applySettings(this.settingsSubject.value);
  }

  updateSettings(partial: Partial<A11ySettings>) {
    const newSettings = { ...this.settingsSubject.value, ...partial };
    this.settingsSubject.next(newSettings);
    this.saveSettings(newSettings);
    this.applySettings(newSettings);
  }

  reset() {
    this.updateSettings(DEFAULT_A11Y_SETTINGS);
  }

  private loadSettings(): A11ySettings {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_A11Y_SETTINGS;
    try {
      return { ...DEFAULT_A11Y_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_A11Y_SETTINGS;
    }
  }

  private saveSettings(settings: A11ySettings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  private applySettings(s: A11ySettings) {
    const html = document.documentElement;
    const body = document.body;

    // Font Scale
    html.style.setProperty('--font-scale', `${this.fontScales[s.fontScaleIndex]}`);

    // Classes
    body.classList.toggle('a11y-dyslexic', s.fontFamily === 'dyslexic');
    body.classList.toggle('a11y-spacing-relaxed', s.spacing === 'relaxed');
    body.classList.toggle('a11y-spacing-wide', s.spacing === 'wide');
    body.classList.toggle('a11y-dark-mode', s.darkMode);
    body.classList.toggle('a11y-contrast', s.highContrast);
    body.classList.toggle('a11y-invert', s.invertColors);
    body.classList.toggle('a11y-low-brightness', s.lowBrightness);
    body.classList.toggle('a11y-highlight-links', s.highlightLinks);
    body.classList.toggle('a11y-highlight-headings', s.highlightHeadings);
    body.classList.toggle('a11y-big-cursor', s.bigCursor);
    body.classList.toggle('a11y-simplify', s.simplifyLayout);
    body.classList.toggle('a11y-reading-guide', s.readingGuide);
    body.classList.toggle('a11y-big-buttons', s.bigButtons);
    
    html.classList.toggle('a11y-reduce-motion', s.reduceMotion);

    // Audio handling: this can be checked by other components
    if (s.muteAll) {
      // Potentially mute all existing audio elements
      document.querySelectorAll('audio, video').forEach((el: any) => el.muted = true);
    }
  }
}
