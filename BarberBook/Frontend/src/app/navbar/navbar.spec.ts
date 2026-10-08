import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar';
import { ApiService } from '../services/api';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let api: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    localStorage.clear();
    await fixture.whenStable();
  });

  afterEach(() => localStorage.clear());

  function sesion(rol: string, nombre = '') {
    localStorage.setItem('access', 't');
    localStorage.setItem('rol', rol);
    if (nombre) localStorage.setItem('nombre', nombre);
    api.updateAuthStatus();
    component.ngOnInit();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el enlace de Dueño solo para el rol Dueño', () => {
    sesion('Dueño', 'Ana');

    expect(component.esDueno()).toBe(true);
    expect(component.esBarbero()).toBe(false);
    expect(component.nombre()).toBe('Ana');
    expect(fixture.nativeElement.textContent).toContain('Dueño');
    expect(fixture.nativeElement.textContent).toContain('Hola, Ana');
  });

  it('un cliente no ve el enlace de Dueño', () => {
    sesion('CLIENTE');

    expect(component.esDueno()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Dueño');
    expect(fixture.nativeElement.textContent).toContain('Mis Citas');
  });

  it('un barbero ve su enlace de Dashboard', () => {
    sesion('BARBERO');

    expect(component.esBarbero()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
  });

  it('sin sesión muestra Login en lugar de Salir', () => {
    api.updateAuthStatus();
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.isLoggedIn()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Login');
  });
});
