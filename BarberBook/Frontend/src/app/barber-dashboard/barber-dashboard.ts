// barber-dashboard.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService, Cita } from '../services/api'; // Importamos la interfaz Cita
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-barber-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barber-dashboard.html'
})
export class BarberDashboardComponent implements OnInit {
  citas = signal<Cita[]>([]); // Usamos el tipo Cita[] en lugar de any[]
  private api = inject(ApiService);

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.api.getBarberAppointments().subscribe({
      next: (data) => this.citas.set(data),
      error: (err) => console.error('Error al cargar agenda:', err)
    });
  }

   completarCita(id: number) {
    this.api.updateBarberCita(id, { estado: 'COMPLETADA' }).subscribe({
    next: () => this.loadDashboard(),
    error: (err) => console.error('Error:', err)
    });
  }
}