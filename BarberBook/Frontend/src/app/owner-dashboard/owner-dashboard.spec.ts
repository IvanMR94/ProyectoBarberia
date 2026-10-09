import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { OwnerDashboardComponent } from './owner-dashboard';
import { DialogService } from '../shared/dialog.service';
import { ToastService } from '../shared/toast.service';
import { environment } from '../../environments/environment';

describe('OwnerDashboardComponent', () => {
  let component: OwnerDashboardComponent;
  let fixture: ComponentFixture<OwnerDashboardComponent>;
  let httpMock: HttpTestingController;
  let dialog: DialogService;
  let toast: ToastService;
  const baseUrl = environment.apiUrl;

  const servicioFixture = { id: 1, nombre: 'Corte', precio: '1000.00', activo: true };
  const barberoFixture = {
    id: 2,
    nombre: 'Omar',
    apellido: 'Rios',
    email: 'omar@barber.com',
    activo: true,
    nota_pausa: '',
    despedido: false,
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
    dialog = TestBed.inject(DialogService);
    toast = TestBed.inject(ToastService);
    fixture.detectChanges();
    flushCargaInicial();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('arranca en la pestaña Resumen con el mes en curso completo', () => {
    expect(component.tab()).toBe('resumen');
    const hoy = new Date();
    const desdeEsperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const hastaEsperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(ultimo.getDate()).padStart(2, '0')}`;
    expect(component.desde()).toBe(desdeEsperado);
    // Hasta = fin de mes, para incluir las citas futuras del período
    expect(component.hasta()).toBe(hastaEsperado);
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

  it('pausa un barbero enviando el motivo en la nota', async () => {
    vi.spyOn(dialog, 'pedirTexto').mockResolvedValue('Licencia médica');
    vi.spyOn(toast, 'exito').mockImplementation(() => {});
    const barbero = component.barberos()[0];

    await component.pausarBarbero(barbero);

    const req = httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/2/`));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      activo: false, nota_pausa: 'Licencia médica',
    });
    req.flush({});
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });
  });

  it('cancelar la pausa no envía nada', async () => {
    vi.spyOn(dialog, 'pedirTexto').mockResolvedValue(null);
    await component.pausarBarbero(component.barberos()[0]);
    httpMock.expectNone((r) => r.url.includes('/owner/barbers/2/'));
  });

  it('despide un barbero con DELETE y recarga el panel', async () => {
    vi.spyOn(dialog, 'confirmar').mockResolvedValue(true);
    vi.spyOn(toast, 'exito').mockImplementation(() => {});

    await component.despedirBarbero(component.barberos()[0]);

    const req = httpMock.expectOne(`${baseUrl}/owner/barbers/2/`);
    expect(req.request.method).toBe('DELETE');
    req.flush({
      mensaje: 'Omar fue despedido del equipo.',
      citas_canceladas: 2,
    });

    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/stats/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31',
      cortes: 0, ingresos: '0', clientes_atendidos: 0, clientes_nuevos: 0,
      por_barbero: [], por_servicio: [],
    });
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31',
      barberos: [{ ...barberoFixture, despedido: true, activo: false }],
    });
    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/appointments/`))
      .flush({ cortes: [] });

    expect(component.barberosActivos().length).toBe(0);
    expect(component.barberosDespedidos().length).toBe(1);
  });

  it('cancelar el despido no envía nada', async () => {
    vi.spyOn(dialog, 'confirmar').mockResolvedValue(false);
    await component.despedirBarbero(component.barberos()[0]);
    httpMock.expectNone((r) => r.method === 'DELETE');
  });

  it('recontrata un ex barbero con POST', async () => {
    vi.spyOn(dialog, 'confirmar').mockResolvedValue(true);
    vi.spyOn(toast, 'exito').mockImplementation(() => {});
    const exBarbero = { ...barberoFixture, despedido: true, activo: false };

    await component.recontratarBarbero(exBarbero);

    const req = httpMock.expectOne(`${baseUrl}/owner/barbers/2/recontratar/`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...barberoFixture, despedido: false });

    httpMock.expectOne((r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
      desde: '2026-10-01', hasta: '2026-10-31', barberos: [barberoFixture],
    });

    expect(component.barberosDespedidos().length).toBe(0);
    expect(component.barberosActivos().length).toBe(1);
  });

  it('cancelar la recontratación no envía nada', async () => {
    vi.spyOn(dialog, 'confirmar').mockResolvedValue(false);
    await component.recontratarBarbero({ ...barberoFixture, despedido: true });
    httpMock.expectNone(
      (r) => r.urlWithParams.includes('recontratar'));
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

  it('muestra el nivel de lealtad de cada cliente', () => {
    component.cambiarTab('clientes');
    httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/owner/clients/`)).flush({
        clientes: [{
          id: 1, username: 'ana', nombre: 'Ana', apellido: 'Torres',
          email: 'ana@test.com', visitas: 3, visitas_30d: 3,
          nivel: 'Preferencial', ultima_visita: null, gasto: '2700',
        }, {
          id: 2, username: 'luis', nombre: 'Luis', apellido: 'Gomez',
          email: 'luis@test.com', visitas: 1, visitas_30d: 0,
          nivel: null, ultima_visita: null, gasto: '1000',
        }],
      });
    fixture.detectChanges();

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Preferencial');
    expect(texto).toContain('Nuevo');
    expect(component.clientes()[0].visitas_30d).toBe(3);
  });

  function refrescarCon(statsExtra: object, barberoExtra: object,
                        cortes: object[]) {
    component.refrescarPeriodo();
    httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/owner/stats/`)).flush({
        desde: '2026-10-01', hasta: '2026-10-31',
        cortes: 1, ingresos: '900.00',
        clientes_atendidos: 1, clientes_nuevos: 0,
        por_barbero: [], por_servicio: [],
        ...statsExtra,
      });
    httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/owner/barbers/`)).flush({
        desde: '2026-10-01', hasta: '2026-10-31',
        barberos: [{ ...barberoFixture, ...barberoExtra }],
      });
    httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/owner/appointments/`))
      .flush({ cortes });
    fixture.detectChanges();
  }

  it('el KPI refleja los descuentos otorgados en el período', () => {
    refrescarCon({ descuentos: '100.00' }, {}, []);

    const kpi = component.kpis()
      .find((k) => k.label === 'Descuentos otorgados');
    expect(kpi?.valor).toContain('100');
    expect(fixture.nativeElement.textContent)
      .toContain('Descuentos otorgados');
  });

  it('el detalle de cortes muestra el estado y el descuento aplicado', () => {
    refrescarCon({ descuentos: '100.00' }, {}, [{
      id: 1, fecha: '2026-10-10T10:00:00Z', barbero: 'Omar Rios',
      cliente: 'Ana Torres', servicio_nombre: 'Corte', estado: 'PENDIENTE',
      precio: '900.00', descuento_aplicado: '100.00',
    }]);

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('PENDIENTE');
    expect(texto).toContain('Descuento');
    expect(component.conDescuento('100.00')).toBe(true);
    expect(component.conDescuento('0.00')).toBe(false);
    expect(component.conDescuento(undefined)).toBe(false);
  });

  it('la card del barbero muestra citas a realizar y descuentos', () => {
    refrescarCon({}, { cortes: 1, ingresos: '900.00',
      descuentos: '100.00', pendientes: 2 }, []);
    component.cambiarTab('barberos');
    fixture.detectChanges();

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('2 a realizar');
    expect(texto).toContain('en descuentos');
    expect(component.barberos()[0].pendientes).toBe(2);
  });

  it('sin descuentos ni pendientes no muestra los chips', () => {
    refrescarCon({}, { pendientes: 0, descuentos: '0' }, []);
    component.cambiarTab('barberos');
    fixture.detectChanges();

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).not.toContain('a realizar');
    expect(texto).not.toContain('en descuentos');
  });
});
