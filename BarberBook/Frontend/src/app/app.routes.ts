import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'barbers', pathMatch: 'full' },
  { path: 'barbers', loadComponent: () => import('../app/barber-list/barber-list').then(m => m.BarberListComponent) },
  { path: 'login', loadComponent: () => import('../app/login/login').then(m => m.LoginComponent) },
  { path: 'my-appointments', loadComponent: () => import('../app/my-appointments/my-appointments').then(m => m.MyAppointmentsComponent) },
]