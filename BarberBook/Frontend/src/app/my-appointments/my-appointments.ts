import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService, Lealtad } from '../services/api';
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
  lealtad = signal<Lealtad | null>(null);
  private apiService = inject(ApiService);

  ngOnInit() {
    this.loadCitas();
    this.loadLealtad();
  }

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

  private loadLealtad() {
    this.apiService.getMiLealtad().subscribe({
      next: (l) => this.lealtad.set(l),
      error: () => this.lealtad.set(null),
    });
  }

  puntosDesbloqueo(): boolean[] {
    const l = this.lealtad();
    if (!l) return [];
    const minimo = l.visitas_minimas;
    const actuales = Math.min(l.sellos, minimo);
    return Array.from({ length: minimo }, (_, i) => i < actuales);
  }

  conDescuento(cita: any): boolean {
    return parseFloat(cita?.descuento_aplicado || '0') > 0;
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