import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Cita {
  id: number;
  barbero: number;
  fecha_hora_inicio: string;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';
  cliente: number;
  precio?: string | null;
  servicio?: number;
  barbero_nombre?: string;
  barbero_apellido?: string;
  servicio_nombre?: string | null;
  cliente_nombre?: string;
  cliente_contacto?: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  precio: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly ENDPOINTS = {
    login: `${this.baseUrl}/auth/login/`,
    register: `${this.baseUrl}/auth/register/`,
    barbers: `${this.baseUrl}/barbers/`,
    appointments: `${this.baseUrl}/appointments/`,
    myAppointments: `${this.baseUrl}/my-appointments/`,
    barberDashboard: `${this.baseUrl}/barber-dashboard/`,
    owner: `${this.baseUrl}/owner`,
  };

  private authStatus = new BehaviorSubject<boolean>(!!localStorage.getItem('access'));
  authStatus$ = this.authStatus.asObservable();

  updateAuthStatus() {
    this.authStatus.next(!!localStorage.getItem('access'));
  }

  limpiarSesion() {
    localStorage.removeItem('access');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    this.updateAuthStatus();
  }

  // --- MÉTODO CRUCIAL PARA ARREGLAR EL BOTÓN "SALIR" ---
  logout() {
    this.limpiarSesion();
    // Forzamos la navegación al login después de limpiar
    window.location.href = '/login'; 
  }

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
    return this.http.post<Cita>(this.ENDPOINTS.appointments, data);
  }

  getMyAppointments(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.ENDPOINTS.myAppointments);
  }

  getBarberAppointments(): Observable<Cita[]> {
    return this.http.get<Cita[]>(this.ENDPOINTS.barberDashboard);
  }

  updateBarberCita(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/barber-appointments/${id}/`, data);
  }

  updateCita(id: number, data: Partial<Cita>): Observable<Cita> {
    return this.http.patch<Cita>(`${this.ENDPOINTS.appointments}${id}/`, data);
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.delete(`${this.ENDPOINTS.appointments}${id}/`);
  }

  // --- Panel del dueño ---
  getOwnerStats(params: { desde?: string; hasta?: string }): Observable<any> {
    return this.http.get(`${this.ENDPOINTS.owner}/stats/`, {
      params: params as any,
    });
  }

  getOwnerBarbers(params: { desde?: string; hasta?: string } = {}): Observable<any> {
    return this.http.get(`${this.ENDPOINTS.owner}/barbers/`, {
      params: params as any,
    });
  }

  createOwnerBarber(data: any): Observable<any> {
    return this.http.post(`${this.ENDPOINTS.owner}/barbers/`, data);
  }

  updateOwnerBarber(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.ENDPOINTS.owner}/barbers/${id}/`, data);
  }

  getOwnerClients(q: string = ''): Observable<any> {
    return this.http.get(`${this.ENDPOINTS.owner}/clients/`, {
      params: q ? { q } : {},
    });
  }

  getOwnerAppointments(params: {
    desde?: string; hasta?: string; barbero?: number;
  }): Observable<any> {
    return this.http.get(`${this.ENDPOINTS.owner}/appointments/`, {
      params: params as any,
    });
  }

  getOwnerServices(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(`${this.ENDPOINTS.owner}/services/`);
  }

  createOwnerService(data: { nombre: string; precio: string }): Observable<Servicio> {
    return this.http.post<Servicio>(`${this.ENDPOINTS.owner}/services/`, data);
  }

  updateOwnerService(id: number, data: any): Observable<Servicio> {
    return this.http.patch<Servicio>(`${this.ENDPOINTS.owner}/services/${id}/`, data);
  }
}