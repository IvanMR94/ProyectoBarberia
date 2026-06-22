import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService } from '../services/api';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [DatePipe],
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
      next: (data) => this.citas.set(data),
      error: (err) => {
        if (err.status === 401) {
          alert('Tu sesión ha expirado, por favor inicia sesión de nuevo.');
        } else {
          console.error('Error cargando citas:', err);
        }
      }
    });
  }
}