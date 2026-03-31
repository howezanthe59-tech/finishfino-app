import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const profile = this.profileService.getProfile();
    if (profile) return true;

    return this.auth.me().pipe(
      tap((res) => this.profileService.saveProfile(res.user)),
      map(() => true),
      catchError(() => of(this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, tab: 'signup' } })))
    );
  }
}
