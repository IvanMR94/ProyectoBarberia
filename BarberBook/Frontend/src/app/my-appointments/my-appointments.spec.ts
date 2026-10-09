import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MyAppointmentsComponent } from './my-appointments';
import { environment } from '../../environments/environment';

describe('MyAppointmentsComponent', () => {
  let component: MyAppointmentsComponent;
  let fixture: ComponentFixture<MyAppointmentsComponent>;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  const lealtadVacia = {
    sellos: 2, visitas_30d: 2, nivel: null, descuento_pct: 0,
    desbloqueado: false, visitas_minimas: 3, faltan_para_desbloquear: 1,
    umbral_frecuente: 2, umbral_preferencial: 3,
  };

  const lealtadDesbloqueada = {
    sellos: 5, visitas_30d: 3, nivel: 'Preferencial', descuento_pct: 10,
    desbloqueado: true, visitas_minimas: 3, faltan_para_desbloquear: 0,
    umbral_frecuente: 2, umbral_preferencial: 3,
  };

  function flushInicial(lealtad: object) {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/my-appointments/`).flush([]);
    httpMock.expectOne(`${baseUrl}/my-loyalty/`).flush(lealtad);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyAppointmentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyAppointmentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    flushInicial(lealtadVacia);
    expect(component).toBeTruthy();
  });

  it('muestra el carnet con el progreso de sellos cuando no está desbloqueado', () => {
    flushInicial(lealtadVacia);

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Carnet de fidelidad');
    expect(texto).toContain('Te falta/n 1 visita');
    expect(component.puntosDesbloqueo()).toEqual([true, true, false]);
  });

  it('muestra el nivel y el descuento cuando está desbloqueado', () => {
    flushInicial(lealtadDesbloqueada);

    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('Preferencial');
    expect(texto).toContain('−10%');
    expect(component.puntosDesbloqueo().every((p) => p)).toBe(true);
  });

  it('marca las citas que tuvieron descuento por lealtad', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${baseUrl}/my-appointments/`).flush([{
      id: 1, estado: 'COMPLETADA', fecha_hora_inicio: '2026-10-01T10:00:00Z',
      precio: '900.00', descuento_aplicado: '100.00',
    }]);
    httpMock.expectOne(`${baseUrl}/my-loyalty/`).flush(lealtadDesbloqueada);
    fixture.detectChanges();

    expect(component.conDescuento({ descuento_aplicado: '100.00' })).toBe(true);
    expect(component.conDescuento({ descuento_aplicado: '0.00' })).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('de descuento');
  });
});
