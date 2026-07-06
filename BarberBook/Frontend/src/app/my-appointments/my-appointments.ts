import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api';
import { CommonModule } from '@angular/common'; // IMPORTANTE: incluye DatePipe

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule], // Agregamos CommonModule aquí
  templateUrl: './my-appointments.html',
})
export class MyAppointmentsComponent implements OnInit {
  citas = signal<any[]>([]);
  private apiService = inject(ApiService);

  ngOnInit() {
    this.loadCitas();
  }

  loadCitas() {
    this.apiService.getMyAppointments().subscribe({
      next: (data) => {
        console.log('Datos recibidos del backend:', data); // <--- MIRA ESTO EN LA CONSOLA
        this.citas.set(data);
      },
      error: (err) => {
        console.error('Error cargando citas:', err);
      }
    });
  }

  // En tu MyAppointmentsComponent
cancelarCita(id: number) {
  if (confirm('¿Cancelar esta cita? El registro se mantendrá en tu historial.')) {
    this.apiService.updateCita(id, { estado: 'CANCELADA' }).subscribe({
      next: () => this.loadCitas(),
      error: () => alert('Error al cancelar.')
    });
  }
}

eliminarCita(id: number) {
  if (confirm('¿Eliminar definitivamente este registro del historial?')) {
    this.apiService.cancelarCita(id).subscribe({
      next: () => this.loadCitas(),
      error: () => alert('Error al eliminar.')
    });
  }
}
}