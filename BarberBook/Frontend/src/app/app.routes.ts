import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { BarberDashboardComponent } from './barber-dashboard/barber-dashboard';

export const routes: Routes = [
  { path: '', redirectTo: 'barbers', pathMatch: 'full' },
  { 
    path: 'barbers', 
    loadComponent: () => import('../app/barber-list/barber-list').then(m => m.BarberListComponent) 
  },
  { 
    path: 'login', 
    loadComponent: () => import('../app/login/login').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./register/register').then(m => m.RegisterComponent) 
  },
  { 
    path: 'my-appointments', 
    loadComponent: () => import('../app/my-appointments/my-appointments').then(m => m.MyAppointmentsComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'barber-dashboard', 
    component: BarberDashboardComponent,
    canActivate: [authGuard] 
  },
];