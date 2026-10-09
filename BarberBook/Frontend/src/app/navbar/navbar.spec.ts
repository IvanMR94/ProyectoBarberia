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

  function linkA(href: string): boolean {
    return !!fixture.nativeElement.querySelector(`a[href="${href}"]`);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el dueño ve Agenda, Dashboard y el saludo con su nombre primero', () => {
    sesion('Dueño', 'Ana');

    expect(component.esDueno()).toBe(true);
    expect(component.esBarbero()).toBe(false);
    expect(component.nombre()).toBe('Ana');
    expect(component.saludo()).toBe('Bienvenido, Ana');

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Bienvenido, Ana');
    expect(texto).toContain('Dashboard');
    expect(linkA('/dueno')).toBe(true);
    expect(linkA('/barbers')).toBe(true);
    expect(linkA('/barber-dashboard')).toBe(false);
  });

  it('un cliente ve Agenda y Mis Citas pero no Dashboard', () => {
    sesion('CLIENTE', 'Sofia');

    expect(component.esDueno()).toBe(false);
    expect(component.saludo()).toBe('Bienvenido, Sofia');

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Mis Citas');
    expect(texto).not.toContain('Dashboard');
    expect(linkA('/dueno')).toBe(false);
    expect(linkA('/barbers')).toBe(true);
    expect(linkA('/my-appointments')).toBe(true);
  });

  it('un barbero solo ve Mi Agenda (no la agenda pública ni Dashboard)', () => {
    sesion('BARBERO', 'Carlos');

    expect(component.esBarbero()).toBe(true);
    expect(component.saludo()).toBe('Bienvenido, Carlos');

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Mi Agenda');
    expect(texto).not.toContain('Dashboard');
    expect(linkA('/barber-dashboard')).toBe(true);
    // El logo siempre apunta a /barbers; el barbero no debe tener el link de Agenda del nav
    const enlacesAgenda = fixture.nativeElement.querySelectorAll('a[href="/barbers"]');
    expect(enlacesAgenda.length).toBe(1);
    expect(linkA('/dueno')).toBe(false);
  });

  it('sin nombre guardado el saludo usa el rol', () => {
    sesion('BARBERO');

    expect(component.saludo()).toBe('Bienvenido barbero');
    expect(fixture.nativeElement.textContent).toContain('Bienvenido barbero');
  });

  it('sin sesión muestra Agenda y Login, y el saludo no', () => {
    api.updateAuthStatus();
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.isLoggedIn()).toBe(false);
    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Login');
    expect(texto).toContain('Agenda');
    expect(texto).not.toContain('Bienvenido');
    expect(linkA('/barbers')).toBe(true);
  });
});
