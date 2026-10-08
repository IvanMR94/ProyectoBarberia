import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { BarberListComponent } from './barber-list';
import { environment } from '../../environments/environment';

describe('BarberListComponent', () => {
  let component: BarberListComponent;
  let fixture: ComponentFixture<BarberListComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  const baseUrl = environment.apiUrl;
  const barbero = { id: 4, nombre: 'Omar', apellido: 'Rios' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture.detectChanges(); // ngOnInit → GET barbers
    httpMock.expectOne(`${baseUrl}/barbers/`).flush([barbero]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('al abrir la agenda pide la disponibilidad de hoy', () => {
    component.openAgenda(barbero);

    const req = httpMock.expectOne(
      (r) => r.url.startsWith(`${baseUrl}/barbers/4/availability/`));
    expect(req.request.url).toContain(`date=${component.hoy}`);
    req.flush({ barbero_id: 4, fecha: component.hoy, disponibles: ['09:00'] });

    expect(component.fechaSeleccionada()).toBe(component.hoy);
    expect(component.disponibilidad()).toEqual(['09:00']);
    expect(component.paso()).toBe('calendario');
  });

  it('al elegir un día futuro se pide la disponibilidad de esa fecha', () => {
    component.openAgenda(barbero);
    httpMock.expectOne((r) => r.url.includes('/availability/'))
      .flush({ disponibles: ['09:00'] });

    component.seleccionarDia({ fecha: '2099-01-15', dia: 15, pasado: false });

    const req = httpMock.expectOne((r) => r.url.includes('date=2099-01-15'));
    req.flush({ disponibles: ['10:00', '11:00'] });

    expect(component.fechaSeleccionada()).toBe('2099-01-15');
    expect(component.disponibilidad()).toEqual(['10:00', '11:00']);
  });

  it('los días pasados del mes actual están marcados como pasado', () => {
    const pasados = component.diasCalendario()
      .filter((c) => c.dia !== null && c.pasado);
    const hoy = new Date();
    // Solo el mes en curso tiene días pasados
    if (hoy.getDate() > 1) {
      expect(pasados.length).toBe(hoy.getDate() - 1);
    }
    expect(pasados.every((c) => c.fecha < component.hoy)).toBe(true);
  });

  it('no se puede retroceder más allá del mes actual', () => {
    const tituloAntes = component.tituloMes();
    component.mesAnterior();
    expect(component.puedeRetroceder()).toBe(false);
    expect(component.tituloMes()).toBe(tituloAntes);
  });

  it('permite navegar a meses futuros', () => {
    const tituloAntes = component.tituloMes();
    component.mesSiguiente();
    expect(component.tituloMes()).not.toBe(tituloAntes);
    expect(component.puedeRetroceder()).toBe(true);
  });

  describe('flujo de reserva con servicios', () => {
    const servicios = [
      { id: 1, nombre: 'Corte', precio: '1000.00' },
      { id: 2, nombre: 'Barba', precio: '500.00' },
    ];

    function abrirConServicios() {
      const conServicios = { ...barbero, servicios };
      component.barbers.set([conServicios]);
      component.openAgenda(conServicios);
      httpMock.expectOne((r) => r.url.includes('/availability/'))
        .flush({ disponibles: ['10:00'] });
    }

    it('hora → servicio → resumen y confirma con el servicio elegido', () => {
      localStorage.setItem('access', 'token');
      abrirConServicios();

      component.elegirHora('10:00');
      expect(component.paso()).toBe('servicio');
      expect(component.horaSeleccionada()).toBe('10:00');

      component.elegirServicio(servicios[1]);
      expect(component.paso()).toBe('resumen');
      expect(component.servicioSeleccionado()?.id).toBe(2);

      vi.spyOn(window, 'alert');
      const navigate = vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));

      component.reservarCita();

      const req = httpMock.expectOne(`${baseUrl}/appointments/`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        barbero: 4,
        fecha_hora_inicio: `${component.hoy}T10:00:00`,
        servicio: 2,
      });
      req.flush({});
      expect(navigate).toHaveBeenCalledWith(['/my-appointments']);
      localStorage.clear();
    });

    it('si el barbero ofrece un solo servicio va directo al resumen', () => {
      const uno = { ...barbero, servicios: [servicios[0]] };
      component.barbers.set([uno]);
      component.openAgenda(uno);
      httpMock.expectOne((r) => r.url.includes('/availability/'))
        .flush({ disponibles: ['10:00'] });

      component.elegirHora('10:00');

      expect(component.paso()).toBe('resumen');
      expect(component.servicioSeleccionado()?.id).toBe(1);
      expect(component.servicioSeSalto()).toBe(true);
    });

    it('sin servicios cargados no avanza de paso', () => {
      const alertSpy = vi.spyOn(window, 'alert');
      component.openAgenda(barbero); // sin servicios
      httpMock.expectOne((r) => r.url.includes('/availability/'))
        .flush({ disponibles: ['10:00'] });

      component.elegirHora('10:00');

      expect(component.paso()).toBe('calendario');
      expect(component.horaSeleccionada()).toBeNull();
      expect(alertSpy).toHaveBeenCalled();
    });

    it('el botón atrás vuelve del resumen al paso de servicio', () => {
      abrirConServicios();
      component.elegirHora('10:00');
      component.elegirServicio(servicios[0]);
      expect(component.paso()).toBe('resumen');

      component.atras();
      expect(component.paso()).toBe('servicio');
      expect(component.servicioSeleccionado()).toBeNull();
    });
  });
});
