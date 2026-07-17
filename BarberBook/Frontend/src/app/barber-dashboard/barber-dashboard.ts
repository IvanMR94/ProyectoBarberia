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
        // Filtramos para mantener solo las pendientes y limpiar el dashboard
        const pendientes = data.filter(c => c.estado === 'PENDIENTE');
        this.citas.set(pendientes);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  refreshDashboard() {
    this.loadDashboard();
  }

  completarCita(id: number) {
    this.isLoading.set(true);
    this.api.updateBarberCita(id, { estado: 'COMPLETADA' }).subscribe({
      next: () => this.loadDashboard(),
      error: () => this.isLoading.set(false)
    });
  }
}