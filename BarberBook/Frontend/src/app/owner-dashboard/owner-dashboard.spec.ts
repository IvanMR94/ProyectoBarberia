import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { OwnerDashboardComponent } from './owner-dashboard';
import { environment } from '../../environments/environment';

describe('OwnerDashboardComponent', () => {
  let component: OwnerDashboardComponent;
  let fixture: ComponentFixture<OwnerDashboardComponent>;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const servicioFixture = { id: 1, nombre: 'Corte', precio: '1000.00', activo: true };
  const barberoFixture = {
    id: 2,
    nombre: 'Omar',
    apellido: 'Rios',
    email: 'omar@barber.com',
    activo: true,
    nota_pausa: '',
    servicios: [servicioFixture],
    cortes: 3,
    ingresos: '3000',
  };

  function flushCargaInicial() {
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/stats/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31',
      cortes: 0, ingresos: '0', clientes_atendidos: 0, clientes_nuevos: 0,
      por_barbero: [], por_servicio: [],
    });
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });
    httpMock.expectOne(`${baseUrl}/owner/services/`).flush([servicioFixture]);
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/appointments/`))
      .flush({ cortes: [] });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushCargaInicial();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca en la pestaña Resumen con el mes en curso', () => {
    expect(component.tab()).toBe('resumen');
    const hoy = new Date();
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    expect(component.desde()).toBe(esperado.substring(0, 8) + '01');
    expect(component.hasta()).toBe(esperado);
  });

  it('carga los barberos del panel con sus servicios', () => {
    expect(component.barberos().length).toBe(1);
    expect(component.barberos()[0].nombre).toBe('Omar');
    expect(component.barberos()[0].servicios[0].nombre).toBe('Corte');
  });

  it('crea un servicio con POST al panel de dueño', () => {
    component.nuevoServicio();
    component.formServicio = { nombre: 'Barba', precio: '500' };
    component.guardarServicio();

    const req = httpMock.expectOne(`${baseUrl}/owner/services/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Barba', precio: '500.00' });
    req.flush({ id: 9, nombre: 'Barba', precio: '500.00', activo: true });

    // Refresca catálogo y barberos después de guardar
    httpMock.expectOne(`${baseUrl}/owner/services/`).flush([
      servicioFixture,
      { id: 9, nombre: 'Barba', precio: '500.00', activo: true },
    ]);
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });

    expect(component.servicios().length).toBe(2);
    expect(component.modalServicio()).toBe(false);
  });

  it('no permite crear un servicio sin precio válido', () => {
    component.nuevoServicio();
    component.formServicio = { nombre: 'Barba', precio: '0' };
    expect(component.formServicioValido()).toBe(false);
    component.guardarServicio();
    httpMock.expectNone(`${baseUrl}/owner/services/`);
  });

  it('el formulario de barbero exige servicios seleccionados', () => {
    component.nuevoBarbero();
    component.formBarbero = {
      nombre: 'Luis', apellido: 'Paz', email: 'luis@barber.com',
      password: '12345678', servicios: [],
    };
    expect(component.formBarberoValido()).toBe(false);

    component.formBarbero.servicios = [1];
    expect(component.formBarberoValido()).toBe(true);
  });

  it('da de alta un barbero con sus servicios', () => {
    component.nuevoBarbero();
    component.formBarbero = {
      nombre: 'Luis', apellido: 'Paz', email: 'luis@barber.com',
      password: '12345678', servicios: [1],
    };
    component.guardarBarbero();

    const req = httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Luis', apellido: 'Paz', email: 'luis@barber.com',
      password: '12345678', servicios: [1],
    });
    req.flush({ id: 3 });
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });

    expect(component.modalBarbero()).toBe(false);
  });

  it('pausa un barbero enviando el motivo en la nota', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Licencia médica');
    const barbero = component.barberos()[0];

    component.pausarBarbero(barbero);

    const req = httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/2/`));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      activo: false, nota_pausa: 'Licencia médica',
    });
    req.flush({});
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });
    vi.restoreAllMocks();
  });

  it('cancelar la pausa no envía nada', () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    component.pausarBarbero(component.barberos()[0]);
    httpMock.expectNone((r) => r.url.includes('/owner/barbers/2/'));
    vi.restoreAllMocks();
  });

  it('busca clientes con el parámetro q', () => {
    component.cambiarTab('clientes');
    httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/owner/clients/`)).flush({ clientes: [] });

    vi.useFakeTimers();
    component.qClientes.set('ana');
    component.buscarClientes();
    vi.advanceTimersByTime(350);
    vi.useRealTimers();

    const req2 = httpMock.expectOne(
      (r) => r.urlWithParams.includes('/owner/clients/')
        && r.urlWithParams.includes('q=ana'));
    req2.flush({ clientes: [] });
  });

  it('formatea precios en pesos', () => {
    expect(component.dinero('1000.00')).toContain('1.000');
    expect(component.dinero('0')).toContain('0');
  });
});
