import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { BarberDashboardComponent } from './barber-dashboard/barber-dashboard';
import { ROL } from './models/roles';

export const routes: Routes = [
  { path: '', redirectTo: 'barbers', pathMatch: 'full' },
  { 
    path: 'barbers', 
    loadComponent: () => import('./barber-list/barber-list').then(m => m.BarberListComponent) 
  },
  { 
    path: 'login', 
    loadComponent: () => import('./login/login').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./register/register').then(m => m.RegisterComponent)
  },
  { 
    path: 'recuperar', 
    loadComponent: () => import('./forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
  },
  { 
    path: 'restablecer/:uid/:token', 
    loadComponent: () => import('./reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },
  { 
    path: 'my-appointments', 
    loadComponent: () => import('./my-appointments/my-appointments').then(m => m.MyAppointmentsComponent),
    canActivate: [authGuard],
    data: { role: ROL.CLIENTE }
  },
  { 
    path: 'barber-dashboard', 
    component: BarberDashboardComponent,
    canActivate: [authGuard],
    data: { role: ROL.BARBERO }
  },
  { 
    path: 'dueno', 
    loadComponent: () => import('./owner-dashboard/owner-dashboard').then(m => m.OwnerDashboardComponent),
    canActivate: [authGuard],
    data: { roles: [ROL.DUENO, ROL.SUPER_ADMIN] }
  },
  // Cualquier ruta desconocida vuelve al inicio
  { path: '**', redirectTo: 'barbers' },
];