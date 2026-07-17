import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-appointments.html',
})
export class MyAppointmentsComponent implements OnInit {
  citas = signal<any[]>([]);
  isLoading = signal<boolean>(false);
  private apiService = inject(ApiService);

  ngOnInit() { this.loadCitas(); }

  loadCitas() {
    this.isLoading.set(true);
    this.apiService.getMyAppointments().subscribe({
      next: (data) => {
        this.citas.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  cancelarCita(id: number) {
    if (confirm('¿Cancelar esta cita?')) {
      this.isLoading.set(true);
      this.apiService.updateCita(id, { estado: 'CANCELADA' }).subscribe({
        next: () => this.loadCitas(),
        error: () => this.isLoading.set(false)
      });
    }
  }

  eliminarCita(id: number) {
    if (confirm('¿Eliminar definitivamente este registro del historial?')) {
      this.isLoading.set(true);
      this.apiService.cancelarCita(id).subscribe({
        next: () => this.loadCitas(),
        error: () => this.isLoading.set(false)
      });
    }
  }
}