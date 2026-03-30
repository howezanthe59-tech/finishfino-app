import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CustomerProfile {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  profileImageUrl?: string;
  role: string;
}

const PROFILE_KEY = 'finishfino_profile';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private profileSubject: BehaviorSubject<CustomerProfile | null>;

  constructor() {
    this.profileSubject = new BehaviorSubject<CustomerProfile | null>(this.readProfile());
  }

  /** Observable stream for components to react to profile changes. */
  get profile$(): Observable<CustomerProfile | null> {
    return this.profileSubject.asObservable();
  }

  getProfile(): CustomerProfile | null {
    return this.profileSubject.value;
  }

  saveProfile(profile: CustomerProfile): void {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    this.profileSubject.next(profile);
  }

  clearProfile(): void {
    localStorage.removeItem(PROFILE_KEY);
    this.profileSubject.next(null);
  }

  private readProfile(): CustomerProfile | null {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? (JSON.parse(raw) as CustomerProfile) : null;
    } catch {
      return null;
    }
  }
}
