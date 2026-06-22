import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8000/api/v1'; // URL de Django

  // Ejemplo: Obtener barberos
  getBarbers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/barbers/`);
  }

  // Ejemplo: Obtener disponibilidad
  getAvailability(barberoId: number, date: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/barbers/${barberoId}/availability/?date=${date}`);
  }
}