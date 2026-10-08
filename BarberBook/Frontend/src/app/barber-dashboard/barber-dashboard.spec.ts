import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { BarberDashboardComponent } from './barber-dashboard';
import { Cita } from '../services/api';
import { environment } from '../../environments/environment';

describe('BarberDashboardComponent', () => {
  let component: BarberDashboardComponent;
  let fixture: ComponentFixture<BarberDashboardComponent>;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  function fecha(d: Date, hora = 10): string {
    const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${f}T${String(hora).padStart(2, '0')}:00:00`;
  }

  function cita(
    id: number,
    fechaHora: string,
    estado: Cita['estado'] = 'PENDIENTE',
  ): Cita {
    return {
      id,
      barbero: 4,
      cliente: 1,
      fecha_hora_inicio: fechaHora,
      estado,
      cliente_nombre: 'Ana Torres',
      cliente_contacto: 'ana@test.com',
      servicio_nombre: 'Corte',
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarberDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarberDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/barber-dashboard/`).flush([]);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('agrupa las citas de hoy, próximas y pasadas', () => {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    component.todas.set([
      cita(1, fecha(ayer, 9)),
      cita(2, fecha(hoy, 15)),
      cita(3, fecha(manana, 11)),
    ]);
    fixture.detectChanges();

    expect(component.hoyCitas().map(c => c.id)).toEqual([2]);
    expect(component.proximas().map(c => c.id)).toEqual([3]);
    expect(component.pasadas().map(c => c.id)).toEqual([1]);
    expect(component.tieneCitas()).toBe(true);
  });

  it('no muestra citas completadas ni canceladas', () => {
    const hoy = new Date();
    component.todas.set([
      cita(1, fecha(hoy, 10), 'COMPLETADA'),
      cita(2, fecha(hoy, 11), 'CANCELADA'),
    ]);
    fixture.detectChanges();

    expect(component.tieneCitas()).toBe(false);
    expect(component.hoyCitas().length).toBe(0);
  });

  it('las próximas se ordenan cronológicamente y las pasadas de más reciente a más vieja', () => {
    const hoy = new Date();
    const pasado = (n: number) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + n);
      return d;
    };

    component.todas.set([
      cita(10, fecha(pasado(2), 12)),
      cita(11, fecha(pasado(3), 9)),
      cita(1, fecha(pasado(-2), 8)),
      cita(2, fecha(pasado(-3), 18)),
    ]);
    fixture.detectChanges();

    expect(component.proximas().map(c => c.id)).toEqual([10, 11]);
    expect(component.pasadas().map(c => c.id)).toEqual([1, 2]);
  });

  it('muestra el nombre y contacto del cliente', () => {
    const hoy = new Date();
    component.todas.set([cita(1, fecha(hoy, 10))]);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Ana Torres');
    expect(texto).toContain('ana@test.com');
    expect(texto).toContain('Corte');
  });
});
