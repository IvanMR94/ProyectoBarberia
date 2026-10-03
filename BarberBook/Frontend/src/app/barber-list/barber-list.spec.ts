import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BarberListComponent } from './barber-list';

describe('BarberListComponent', () => {
  let component: BarberListComponent;
  let fixture: ComponentFixture<BarberListComponent>;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://127.0.0.1:8000/api/v1';
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

    fixture.detectChanges(); // ngOnInit → GET barbers
    httpMock.expectOne(`${baseUrl}/barbers/`).flush([barbero]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

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
});
