import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProfileComponent } from './profile.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { OrderTrackComponent } from './order-track.component';

const routes: Routes = [
  { path: 'profile', component: ProfileComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'orders/:id/track', component: OrderTrackComponent }
];

@NgModule({
  declarations: [
    ProfileComponent,
    DashboardComponent,
    OrderTrackComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class UserModule { }
