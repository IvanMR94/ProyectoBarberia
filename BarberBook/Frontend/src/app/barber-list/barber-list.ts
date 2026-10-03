import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Barber } from '../models/barber.model';
import { ApiService } from '../services/api';

interface CeldaDia {
  fecha: string;       // YYYY-MM-DD
  dia: number | null;  // null = celda vacía de relleno
  pasado: boolean;
}

@Component({
  selector: 'app-barber-list',
  standalone: true,
  templateUrl: './barber-list.html',
})
export class BarberListComponent implements OnInit {
  barbers = signal<Barber[]>([]);
  selectedBarber = signal<Barber | null>(null);
  isModalOpen = signal(false);
  disponibilidad = signal<string[]>([]);

  // Fecha de hoy en formato local (no UTC, para que a la noche no se "adelante" el día)
  readonly hoy = this.formatoFecha(new Date());

  // Estado del calendario navegable
  fechaSeleccionada = signal<string>(this.hoy);
  anio = signal<number>(new Date().getFullYear());
  mes = signal<number>(new Date().getMonth()); // 0-11

  readonly nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  readonly nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  tituloMes = computed(
    () => `${this.nombresMeses[this.mes()]} ${this.anio()}`);

  // No se puede retroceder más allá del mes actual
  puedeRetroceder = computed(() => {
    const hoy = new Date();
    return this.anio() > hoy.getFullYear() ||
      (this.anio() === hoy.getFullYear() && this.mes() > hoy.getMonth());
  });

  diasCalendario = computed<CeldaDia[]>(() => {
    const anio = this.anio();
    const mes = this.mes();
    // Lunes primero: getDay() devuelve 0=domingo
    const offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    const celdas: CeldaDia[] = [];
    for (let i = 0; i < offset; i++) {
      celdas.push({ fecha: `relleno-${i}`, dia: null, pasado: false });
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = this.formatoFecha(new Date(anio, mes, dia));
      celdas.push({ fecha, dia, pasado: fecha < this.hoy });
    }
    return celdas;
  });

  fechaSeleccionadaLarga = computed(() => {
    const [anio, mes, dia] = this.fechaSeleccionada().split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const dias = [
      'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
    ];
    return `${dias[fecha.getDay()]}, ${dia} de ` +
      `${this.nombresMeses[mes - 1].toLowerCase()} de ${anio}`;
  });

  private apiService = inject(ApiService);
  private router = inject(Router);

  ngOnInit() {
    this.loadBarbers();
  }

  private loadBarbers() {
    this.apiService.getBarbers().subscribe({
      next: (data) => this.barbers.set(data),
      error: (err) => console.error('Error al cargar barberos:', err)
    });
  }

  openAgenda(barber: Barber) {
    const hoy = new Date();
    this.anio.set(hoy.getFullYear());
    this.mes.set(hoy.getMonth());
    this.fechaSeleccionada.set(this.hoy);
    this.selectedBarber.set(barber);
    this.isModalOpen.set(true);
    this.cargarDisponibilidad();
  }

  mesAnterior() {
    if (!this.puedeRetroceder()) return;
    if (this.mes() === 0) {
      this.mes.set(11);
      this.anio.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
  }

  mesSiguiente() {
    if (this.mes() === 11) {
      this.mes.set(0);
      this.anio.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
  }

  seleccionarDia(celda: CeldaDia) {
    if (celda.dia === null || celda.pasado) return;
    this.fechaSeleccionada.set(celda.fecha);
    this.cargarDisponibilidad();
  }

  formatoFecha(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private cargarDisponibilidad() {
    const barbero = this.selectedBarber();
    if (!barbero) return;

    this.disponibilidad.set([]);
    this.apiService.getAvailability(barbero.id, this.fechaSeleccionada()).subscribe({
      next: (res: any) => this.disponibilidad.set(res.disponibles),
      error: (err) => console.error('Error cargando disponibilidad:', err)
    });
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedBarber.set(null);
    this.disponibilidad.set([]);
  }

  reservarCita(hora: string) {
    // Verificamos si hay token antes de intentar reservar
    const token = localStorage.getItem('access');

    if (!token) {
      if (confirm('¡Ups! Necesitas una cuenta para reservar. ¿Quieres registrarte ahora?')) {
        this.router.navigate(['/register']);
      }
      return;
    }

    const payload = {
      barbero: this.selectedBarber()?.id,
      fecha_hora_inicio: `${this.fechaSeleccionada()}T${hora}:00`,
      estado: 'PENDIENTE'
    };

    this.apiService.postCita(payload).subscribe({
      next: () => {
        alert('¡Cita reservada con éxito!');
        this.closeModal();
        this.router.navigate(['/my-appointments']);
      },
      error: (err) => {
        console.error('Error al reservar:', err);
        alert('Hubo un error al reservar. Por favor intenta de nuevo.');
      }
    });
  }
}
