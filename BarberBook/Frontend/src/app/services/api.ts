import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    // Asumiendo que tu endpoint de login es /auth/login/
    return this.http.post(`${this.baseUrl}/auth/login/`, credentials);
  }

  // --- MÉTODOS PRIVADOS (Requieren Autenticación) ---

  getMyAppointments(): Observable<any> {
    const token = localStorage.getItem('token');
    
    // Configuramos los headers para enviar el token JWT
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.baseUrl}/my-appointments/`, { headers });
  }
}