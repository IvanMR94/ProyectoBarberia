import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';
import { ROL } from '../models/roles';
import { logError } from '../utils/log';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html'
})
export class LoginComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.api.login(this.loginForm.value).subscribe({
      next: (res) => {
        // 1. LIMPIEZA PREVIA: borramos solo las credenciales anteriores
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('rol');

        // 2. GUARDADO
        const rol = res.rol || ROL.CLIENTE;
        localStorage.setItem('access', res.access);
        if (res.refresh) {
          // Necesario para poder cerrar la sesión en el servidor (logout).
          localStorage.setItem('refresh', res.refresh);
        }
        localStorage.setItem('rol', rol);
        localStorage.setItem('nombre', res.nombre || '');
        
        // 3. ACTUALIZACIÓN DEL ESTADO
        this.api.updateAuthStatus();
        
        // 4. REDIRECCIÓN
        if (rol === ROL.BARBERO) {
          this.router.navigate(['/barber-dashboard']);
        } else if (rol === ROL.DUENO) {
          this.router.navigate(['/dueno']);
        } else if (rol === ROL.CLIENTE) {
          this.router.navigate(['/my-appointments']);
        } else {
          // SUPER_ADMIN u otros roles: su lugar es el admin de Django
          this.router.navigate(['/barbers']);
        }
      },
      error: (err) => {
        logError('login', err);
        if (err.status === 429) {
          alert('Demasiados intentos fallidos. Esperá un minuto y probá de nuevo.');
        } else {
          alert('Credenciales inválidas, intenta nuevamente.');
        }
      }
    });
  }
}