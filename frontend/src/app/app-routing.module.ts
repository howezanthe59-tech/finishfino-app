import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent }     from './pages/home/home.component';
import { AboutComponent }    from './pages/about/about.component';
import { ProductsComponent } from './pages/products/products.component';
import { BookComponent }     from './pages/book/book.component';
import { ContactComponent }  from './pages/contact/contact.component';
import { LoginComponent }    from './pages/login/login.component';
import { TermsComponent }    from './pages/terms/terms.component';
import { PrivacyComponent }  from './pages/privacy/privacy.component';
import { ProfileComponent }  from './pages/profile/profile.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ServicesComponent } from './pages/services/services.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { AuthGuard } from './services/auth.guard';
import { AdminGuard } from './services/admin.guard';
import { CustomerGuard } from './services/customer.guard';

const routes: Routes = [
  { path: '',        component: HomeComponent },
  { path: 'about',   component: AboutComponent },
  { path: 'services',component: ServicesComponent },
  { path: 'products',component: ProductsComponent },
  { path: 'book',    component: BookComponent, canActivate: [CustomerGuard] },
  { path: 'contact', component: ContactComponent },
  { path: 'login',   component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [CustomerGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [CustomerGuard] },
  { path: 'terms',   component: TermsComponent },
  { path: 'privacy', component: PrivacyComponent },
 { path: '**',      redirectTo: '' }   // 404 fallback
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
