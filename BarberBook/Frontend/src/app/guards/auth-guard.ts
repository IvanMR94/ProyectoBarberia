import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  
  // 1. Verificar si está logueado
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar el rol si la ruta lo requiere
  const expectedRole = route.data?.['role'];
  if (expectedRole && rol !== expectedRole) {
    // Si el rol no coincide, redirigir al inicio o a su dashboard correspondiente
    router.navigate([rol === 'BARBERO' ? '/barber-dashboard' : '/my-appointments']);
    return false;
  }

  return true;
};