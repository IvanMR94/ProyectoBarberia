import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

describe('Navegación a /dueno', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function preparar() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    return RouterTestingHarness.create();
  }

  it('logueado como Dueño la ruta /dueno carga el panel', async () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'Dueño');
    const harness = await preparar();

    await harness.navigateByUrl('/dueno');

    expect(harness.routeNativeElement?.textContent).toContain('Resumen');
  });

  it('sin sesión /dueno redirige al login', async () => {
    const harness = await preparar();

    await harness.navigateByUrl('/dueno');

    expect(harness.routeNativeElement?.textContent).toContain('Correo');
  });

  it('con rol CLIENTE /dueno lo manda a su home', async () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'CLIENTE');
    const harness = await preparar();

    await harness.navigateByUrl('/dueno');

    expect(harness.routeNativeElement?.textContent).not.toContain(
      'Resumen de dueño',
    );
  });

  it('el panel dispara sus llamadas al API del dueño', async () => {
    localStorage.setItem('access', 'token');
    localStorage.setItem('rol', 'Dueño');
    const harness = await preparar();

    await harness.navigateByUrl('/dueno');

    const http = TestBed.inject(HttpTestingController);
    const peticiones = http
      .match(() => true)
      .map((r) => r.request.url);
    expect(peticiones).toContain(`${environment.apiUrl}/owner/stats/`);
    http.match(() => true).forEach((r) => r.flush({}));
  });
});

describe('Navegación a /recuperar', () => {
  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('la ruta pública /recuperar carga el formulario sin sesión', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/recuperar');

    expect(harness.routeNativeElement?.textContent).toContain(
      'Recuperar contraseña');
  });

  it('el link de recuperación es navegable desde el login', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/login');

    expect(harness.routeNativeElement?.textContent).toContain(
      '¿Olvidaste tu contraseña?');
  });
});
