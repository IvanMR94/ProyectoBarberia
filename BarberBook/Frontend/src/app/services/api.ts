import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

// Definición de la estructura de datos (Modelo)
export interface Cita {
  id: number;
  barbero: number;
  fecha_hora_inicio: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
  cliente: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1';

  // Centralización de rutas (Evita el hardcodeo en los métodos)
  private readonly ENDPOINTS = {
    login: `${this.baseUrl}/auth/login/`,
    register: `${this.baseUrl}/auth/register/`,
    barbers: `${this.baseUrl}/barbers/`,
    appointments: `${this.baseUrl}/appointments/`,
    myAppointments: `${this.baseUrl}/my-appointments/`,
    barberDashboard: `${this.baseUrl}/barber-dashboard/`,
  };

  private authStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('token'));
  authStatus$ = this.authStatus.asObservable();

  updateAuthStatus() {
    this.authStatus.next(!!localStorage.getItem('token'));
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    };
  }

 
  updateBarberCita(id: number, data: any): Observable<any> {
    return this.http.patch(`http://127.0.0.1:8000/api/v1/barber-appointments/${id}/`, data, this.getHeaders());
  }

  // --- MÉTODOS ---
  login(credentials: any): Observable<any> {
    return this.http.post(this.ENDPOINTS.login, credentials);
  }

  register(userData: any): Observable<any> {
    return this.http.post(this.ENDPOINTS.register, userData);
  }

  getBarbers(): Observable<any> {
    return this.http.get(this.ENDPOINTS.barbers);
  }

  getAvailability(barberoId: number, date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/barbers/${barberoId}/availability/?date=${date}`);
  }

  postCita(data: any): Observable<Cita> {
    return this.http.post<Cita>(this.ENDPOINTS.appointments, data, this.getHeaders());
  }

  getMyAppointments(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.ENDPOINTS.myAppointments, this.getHeaders());
  }

  getBarberAppointments(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.ENDPOINTS.barberDashboard, this.getHeaders());
  }

  updateCita(id: number, data: Partial<Cita>): Observable<Cita> {
    return this.http.patch<Cita>(`${this.ENDPOINTS.appointments}${id}/`, data, this.getHeaders());
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.delete(`${this.ENDPOINTS.appointments}${id}/`, this.getHeaders());
  }
}