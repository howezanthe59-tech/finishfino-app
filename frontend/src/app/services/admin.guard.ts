import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ProfileService } from './profile.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private profileService: ProfileService,
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const profile = this.profileService.getProfile();
    const token = this.auth.getToken();
    
    if (!token) {
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }

    if (profile && profile.role === 'admin') {
      return true;
    }

    if (profile && profile.role !== 'admin') {
      return this.router.createUrlTree(['/dashboard']);
    }

    return this.auth.me().pipe(
      tap((res) => this.profileService.saveProfile(res.user)),
      map((res) => (res.user.role === 'admin' ? true : this.router.createUrlTree(['/dashboard']))),
      catchError(() => of(this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })))
    );
  }
}
