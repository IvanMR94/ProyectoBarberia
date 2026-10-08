import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ApiService, Cita } from '../services/api';
import { CommonModule } from '@angular/common';

type Grupo = 'hoy' | 'futuro' | 'pasado';

@Component({
  selector: 'app-barber-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barber-dashboard.html'
})
export class BarberDashboardComponent implements OnInit {
  todas = signal<Cita[]>([]);
  isLoading = signal<boolean>(false);
  private api = inject(ApiService);

  hoyCitas = computed(() => this.filtrar('hoy'));
  proximas = computed(() => this.filtrar('futuro'));
  pasadas = computed(() => this.filtrar('pasado'));

  tieneCitas = computed(() =>
    this.hoyCitas().length + this.proximas().length + this.pasadas().length > 0);

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.isLoading.set(true);
    this.api.getBarberAppointments().subscribe({
      next: (data) => {
        this.todas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  refreshDashboard() {
    this.loadDashboard();
  }

  private filtrar(grupo: Grupo): Cita[] {
    const activas = this.todas().filter(
      c => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA');

    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const inicioManana = new Date(inicioHoy);
    inicioManana.setDate(inicioHoy.getDate() + 1);

    const delGrupo = activas.filter(c => {
      const fecha = new Date(c.fecha_hora_inicio);
      if (grupo === 'hoy') return fecha >= inicioHoy && fecha < inicioManana;
      if (grupo === 'futuro') return fecha >= inicioManana;
      return fecha < inicioHoy;
    });

    return delGrupo.sort((a, b) => {
      const fa = +new Date(a.fecha_hora_inicio);
      const fb = +new Date(b.fecha_hora_inicio);
      // Pasadas: de la más reciente a la más vieja; el resto: cronológico
      return grupo === 'pasado' ? fb - fa : fa - fb;
    });
  }

  confirmarCita(id: number) {
    this.isLoading.set(true);
    this.api.updateBarberCita(id, { estado: 'CONFIRMADA' }).subscribe({
      next: () => this.loadDashboard(),
      error: () => this.isLoading.set(false)
    });
  }

  completarCita(id: number) {
    this.isLoading.set(true);
    this.api.updateBarberCita(id, { estado: 'COMPLETADA' }).subscribe({
      next: () => this.loadDashboard(),
      error: () => this.isLoading.set(false)
    });
  }
}
