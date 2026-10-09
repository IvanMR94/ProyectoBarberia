import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { ResetPasswordComponent } from './reset-password';
import { environment } from '../../environments/environment';

describe('ResetPasswordComponent', () => {
  let http: HttpTestingController;

  async function montar(uid = 'uid123', token = 'tok456') {
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'restablecer/:uid/:token', component: ResetPasswordComponent },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/restablecer/${uid}/${token}`);
    return harness.routeDebugElement!.componentInstance as ResetPasswordComponent;
  }

  function responderValidate(ok: boolean) {
    const req = http.expectOne(
      `${environment.apiUrl}/auth/password-reset/validate/`);
    expect(req.request.method).toBe('POST');
    if (ok) {
      req.flush({ valido: true });
    } else {
      req.flush({ detail: 'El enlace no es válido o expiró.' },
                { status: 400, statusText: 'Bad Request' });
    }
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('con un enlace válido muestra el formulario', async () => {
    const component = await montar();
    responderValidate(true);
    expect(component.estado()).toBe('valido');
  });

  it('con un enlace inválido muestra la pantalla de error', async () => {
    const component = await montar();
    responderValidate(false);
    expect(component.estado()).toBe('invalido');
  });

  it('al guardar envía password y navega a éxito', async () => {
    const component = await montar();
    responderValidate(true);

    component.form.setValue({
      password: 'NuevaClave123', password2: 'NuevaClave123' });
    component.enviar();

    const req = http.expectOne(
      `${environment.apiUrl}/auth/password-reset/confirm/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      uidb64: 'uid123', token: 'tok456', password: 'NuevaClave123' });
    req.flush({ mensaje: 'ok' });
    expect(component.estado()).toBe('listo');
  });

  it('si el backend rechaza la contraseña muestra el detalle', async () => {
    const component = await montar();
    responderValidate(true);

    component.form.setValue({
      password: 'NuevaClave123', password2: 'NuevaClave123' });
    component.enviar();

    const req = http.expectOne(
      `${environment.apiUrl}/auth/password-reset/confirm/`);
    req.flush({ detail: 'La contraseña es demasiado común.' },
              { status: 400, statusText: 'Bad Request' });

    expect(component.estado()).toBe('valido');
    expect(component.mensajeError()).toBe('La contraseña es demasiado común.');
  });

  it('no envía si las contraseñas no coinciden', async () => {
    const component = await montar();
    responderValidate(true);

    component.form.setValue({
      password: 'NuevaClave123', password2: 'OtraDistinta1' });
    component.enviar();

    expect(component.coincide()).toBe(false);
    expect(component.estado()).toBe('valido');
    http.expectNone(
      `${environment.apiUrl}/auth/password-reset/confirm/`);
  });

  it('detecta contraseñas que son solo números', async () => {
    const component = await montar();
    responderValidate(true);

    component.form.setValue({ password: '12345678', password2: '12345678' });
    expect(component.soloNumeros()).toBe(true);
    expect(component.form.invalid).toBe(false);
    expect(component.coincide()).toBe(true);
  });
});
