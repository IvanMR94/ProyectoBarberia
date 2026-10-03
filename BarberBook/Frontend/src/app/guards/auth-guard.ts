import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const token = localStorage.getItem('access');
  const rol = localStorage.getItem('rol');
  
  // 1. Verificar si está logueado
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar el rol si la ruta lo requiere
  const expectedRole = route.data?.['role'];
  if (expectedRole && rol !== expectedRole) {
    // Si el rol no coincide, redirigir a su dashboard o al inicio
    router.navigate([
      rol === 'BARBERO' ? '/barber-dashboard'
      : rol === 'CLIENTE' ? '/my-appointments'
      : '/barbers'
    ]);
    return false;
  }

  return true;
};