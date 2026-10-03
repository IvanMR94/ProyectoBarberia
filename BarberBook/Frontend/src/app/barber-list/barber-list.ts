import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Barber } from '../models/barber.model';
import { ApiService } from '../services/api'; 

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
    this.selectedBarber.set(barber);
    this.isModalOpen.set(true);
    
    const hoy = new Date().toISOString().split('T')[0]; 
    this.apiService.getAvailability(barber.id, hoy).subscribe({
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

    const fechaHoy = new Date().toISOString().split('T')[0];
    const payload = {
      barbero: this.selectedBarber()?.id,
      fecha_hora_inicio: `${fechaHoy}T${hora}:00`,
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