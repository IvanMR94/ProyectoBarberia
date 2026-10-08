import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { RegisterComponent } from './register';
import { ApiService } from '../services/api';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let api: ApiService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
    vi.spyOn(window, 'alert');
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no registra con contraseña de menos de 8 caracteres', () => {
    const spy = vi.spyOn(api, 'register');
    component.user = {
      nombre: 'Ana', apellido: 'Torres',
      email: 'ana@test.com', password: '1234567',
    };

    component.registrar();

    expect(spy).not.toHaveBeenCalled();
  });

  it('envía el registro sin incluir el rol', () => {
    const spy = vi.spyOn(api, 'register').mockReturnValue(
      { subscribe: ({ next }: any) => next({}) } as any);

    component.user = {
      nombre: 'Ana', apellido: 'Torres',
      email: 'ana@test.com', password: '12345678',
    };
    component.registrar();

    expect(spy).toHaveBeenCalledWith({
      username: 'ana@test.com',
      email: 'ana@test.com',
      nombre: 'Ana',
      apellido: 'Torres',
      password: '12345678',
    });
  });
});
