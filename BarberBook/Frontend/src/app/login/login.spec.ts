import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login';
import { ApiService } from '../services/api';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let api: ApiService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    router = TestBed.inject(Router);
    localStorage.clear();
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('guarda sesión y lleva al cliente a Mis Citas', () => {
    const navigate = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    vi.spyOn(api, 'login').mockReturnValue(
      of({ access: 't', rol: 'CLIENTE', nombre: 'Ana' }));

    component.loginForm.patchValue({ username: 'ana@test.com', password: 'secret1' });
    component.login();

    expect(localStorage.getItem('rol')).toBe('CLIENTE');
    expect(localStorage.getItem('nombre')).toBe('Ana');
    expect(navigate).toHaveBeenCalledWith(['/my-appointments']);
  });

  it('con rol Dueño lleva al panel del dueño', () => {
    const navigate = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    vi.spyOn(api, 'login').mockReturnValue(
      of({ access: 't', rol: 'Dueño', nombre: 'Hugo' }));

    component.loginForm.patchValue({ username: 'hugo@test.com', password: 'secret1' });
    component.login();

    expect(localStorage.getItem('rol')).toBe('Dueño');
    expect(navigate).toHaveBeenCalledWith(['/dueno']);
  });

  it('con rol BARBERO lleva a su agenda', () => {
    const navigate = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    vi.spyOn(api, 'login').mockReturnValue(
      of({ access: 't', rol: 'BARBERO', nombre: 'Omar' }));

    component.loginForm.patchValue({ username: 'omar@test.com', password: 'secret1' });
    component.login();

    expect(navigate).toHaveBeenCalledWith(['/barber-dashboard']);
  });

  it('el formulario usa el campo de correo', () => {
    expect(component.loginForm.contains('username')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Correo');
  });

  it('muestra el link a la recuperación de contraseña', () => {
    expect(fixture.nativeElement.textContent).toContain(
      '¿Olvidaste tu contraseña?');
  });

  it('guarda el refresh token para poder cerrar sesión en el servidor', () => {
    vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    vi.spyOn(api, 'login').mockReturnValue(of({
      access: 'a', refresh: 'r', rol: 'CLIENTE', nombre: 'Ana' }));

    component.loginForm.patchValue({ username: 'ana@test.com', password: 'secret1' });
    component.login();

    expect(localStorage.getItem('refresh')).toBe('r');
  });
});
