import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ForgotPasswordComponent } from './forgot-password';
import { ApiService } from '../services/api';
import { environment } from '../../environments/environment';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('al enviar un correo válido muestra el mensaje genérico', () => {
    vi.spyOn(api, 'solicitarRecupero').mockReturnValue(
      of({ mensaje: 'Si existe una cuenta con ese correo...' }));

    component.form.setValue({ email: 'ana@test.com' });
    component.enviar();
    fixture.detectChanges();

    expect(component.estado()).toBe('listo');
    expect(component.linkPrueba()).toBe('');
    expect(fixture.nativeElement.textContent).toContain(
      'Si existe una cuenta con ese correo');
  });

  it('en desarrollo muestra el link de prueba si el backend lo devuelve', () => {
    vi.spyOn(api, 'solicitarRecupero').mockReturnValue(
      of({ mensaje: 'ok', link: 'http://localhost:4200/restablecer/u/t' }));

    component.form.setValue({ email: 'ana@test.com' });
    component.enviar();

    expect(component.linkPrueba()).toBe(
      'http://localhost:4200/restablecer/u/t');
  });

  it('ante 429 informa que hay que esperar', () => {
    vi.spyOn(api, 'solicitarRecupero').mockReturnValue(
      throwError(() => ({ status: 429 })));

    component.form.setValue({ email: 'ana@test.com' });
    component.enviar();

    expect(component.estado()).toBe('idle');
    expect(component.mensajeError()).toContain('Demasiadas solicitudes');
  });

  it('el formulario exige un correo válido', () => {
    component.form.setValue({ email: 'no-es-email' });
    expect(component.form.invalid).toBe(true);
  });

  it('solicitarRecupero apunta a /auth/password-reset/ con el email', () => {
    component.form.setValue({ email: 'ana@test.com' });
    component.enviar();

    const req = http.expectOne(`${environment.apiUrl}/auth/password-reset/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@test.com' });
    req.flush({ mensaje: 'ok' });
    expect(component.estado()).toBe('listo');
  });
});
