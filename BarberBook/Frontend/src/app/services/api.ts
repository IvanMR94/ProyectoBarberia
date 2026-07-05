import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api/v1';

  // --- MÉTODOS PÚBLICOS ---
  
  getBarbers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/barbers/`);
  }

  getAvailability(barberoId: number, date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/barbers/${barberoId}/availability/?date=${date}`);
  }

  postCita(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/appointments/`, data);
  }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login/`, credentials);
  }

  // Nuevo método para registrarse
  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register/`, userData);
  }

  // --- MÉTODOS PRIVADOS ---

  getMyAppointments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/my-appointments/`);
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/appointments/${id}/`);
  }
}