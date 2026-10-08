import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ROL } from '../models/roles';

const HOME_POR_ROL: Record<string, string> = {
  [ROL.BARBERO]: '/barber-dashboard',
  [ROL.CLIENTE]: '/my-appointments',
  [ROL.DUENO]: '/dueno',
};

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('access');
  const rol = localStorage.getItem('rol');

  // 1. Verificar si está logueado
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar el rol: soporta role (un rol) o roles (lista)
  const rolesPermitidos: string[] | undefined =
    route.data?.['roles'] ?? (route.data?.['role'] ? [route.data['role']] : undefined);

  if (rolesPermitidos && !rolesPermitidos.includes(rol ?? '')) {
    router.navigate([HOME_POR_ROL[rol ?? ''] ?? '/barbers']);
    return false;
  }

  return true;
};
