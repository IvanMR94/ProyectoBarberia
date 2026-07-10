import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ApiService } from '../services/api';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const apiService = inject(ApiService);
  
  const token = localStorage.getItem('token');

  // Si existe token, permitimos el paso
  if (token) {
    return true;
  }

  // Si no hay token, redirigimos al login
  // Guardamos la URL a la que intentaba acceder para redirigirlo después del login 
  router.navigate(['/login']);
  return false;
};