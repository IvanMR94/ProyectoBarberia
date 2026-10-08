import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const ruta = (data: Record<string, unknown>) =>
    ({ data } as unknown as ActivatedRouteSnapshot);

  const executeGuard = (route: ActivatedRouteSnapshot) =>
    TestBed.runInInjectionContext(() =>
      authGuard(route, { url: '/x' } as RouterStateSnapshot));

  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('sin token redirige al login y bloquea el acceso', () => {
    const spy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    const result = executeGuard(ruta({}));

    expect(result).toBe(false);
    expect(spy).toHaveBeenCalledWith(['/login']);
  });

  it('con token y rol correcto permite el acceso', () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'BARBERO');

    const result = executeGuard(ruta({ role: 'BARBERO' }));

    expect(result).toBe(true);
  });

  it('con rol equivocado bloquea y lo manda a su home', () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'CLIENTE');
    const spy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

    const result = executeGuard(ruta({ role: 'BARBERO' }));

    expect(result).toBe(false);
    expect(spy).toHaveBeenCalledWith(['/my-appointments']);
  });

  it('soporta la lista de roles data.roles', () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'Dueño');
    vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

    const permitido = executeGuard(
      ruta({ roles: ['Dueño', 'SUPER_ADMIN'] }));
    expect(permitido).toBe(true);

    const denegado = executeGuard(ruta({ roles: ['BARBERO'] }));
    expect(denegado).toBe(false);
  });

  it('un dueño sin permiso para el panel del barbero vuelve a su home', () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'Dueño');
    const spy = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

    const result = executeGuard(ruta({ role: 'BARBERO' }));

    expect(result).toBe(false);
    expect(spy).toHaveBeenCalledWith(['/dueno']);
  });
});
