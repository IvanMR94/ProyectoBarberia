import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService, Cita } from '../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-barber-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barber-dashboard.html'
})
export class BarberDashboardComponent implements OnInit {
  citas = signal<Cita[]>([]);
  isLoading = signal<boolean>(false);
  private api = inject(ApiService);

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.isLoading.set(true);
    this.api.getBarberAppointments().subscribe({
      next: (data) => {
        // Citas activas: pendientes (a confirmar) y confirmadas (a finalizar)
        const activas = data.filter(c => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA');
        this.citas.set(activas);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  refreshDashboard() {
    this.loadDashboard();
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