import { Component, signal, inject, OnInit } from '@angular/core';
import { ApiService, Lealtad } from '../services/api';
import { CommonModule } from '@angular/common';
import { DialogService } from '../shared/dialog.service';
import { ToastService } from '../shared/toast.service';

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
  private dialog = inject(DialogService);
  private toast = inject(ToastService);

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

  async cancelarCita(id: number) {
    const ok = await this.dialog.confirmar({
      titulo: 'Cancelar cita',
      mensaje: '¿Cancelar esta cita? Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, cancelar',
      peligro: true,
    });
    if (!ok) return;
    this.isLoading.set(true);
    this.apiService.updateCita(id, { estado: 'CANCELADA' }).subscribe({
      next: () => {
        this.toast.exito('Cita cancelada.');
        this.loadCitas();
      },
      error: () => {
        this.toast.error('No se pudo cancelar la cita.');
        this.isLoading.set(false);
      }
    });
  }

  async eliminarCita(id: number) {
    const ok = await this.dialog.confirmar({
      titulo: 'Eliminar del historial',
      mensaje: '¿Eliminar definitivamente este registro del historial?',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.isLoading.set(true);
    this.apiService.cancelarCita(id).subscribe({
      next: () => {
        this.toast.exito('Registro eliminado.');
        this.loadCitas();
      },
      error: () => {
        this.toast.error('No se pudo eliminar el registro.');
        this.isLoading.set(false);
      }
    });
  }
}