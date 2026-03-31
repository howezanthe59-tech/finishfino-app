import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class CustomerGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | boolean | UrlTree {
    const profile = this.profileService.getProfile();
    if (profile) {
      return profile.role === 'admin' ? this.router.createUrlTree(['/admin']) : true;
    }

    return this.auth.me().pipe(
      tap((res) => this.profileService.saveProfile(res.user)),
      map((res) => (res.user.role === 'admin' ? this.router.createUrlTree(['/admin']) : true)),
      catchError(() => of(this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })))
    );
  }
}
