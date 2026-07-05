import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    return true; // Acceso permitido
  } else {
    router.navigate(['/login']); // Acceso denegado, al login
    return false;
  }
};