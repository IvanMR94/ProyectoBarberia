import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiService } from '../services/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const api = inject(ApiService);
  const token = localStorage.getItem('access');
  
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el servidor nos dice que no estamos autorizados (401)
      if (error.status === 401) {
        localStorage.removeItem('access');
        localStorage.removeItem('rol');
        api.updateAuthStatus();
        // Redirigimos al login
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};