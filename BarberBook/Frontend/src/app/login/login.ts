import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';

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
        localStorage.removeItem('rol');

        // 2. GUARDADO
        const rol = res.rol || 'CLIENTE';
        localStorage.setItem('access', res.access);
        localStorage.setItem('rol', rol);
        
        // 3. ACTUALIZACIÓN DEL ESTADO
        this.api.updateAuthStatus();
        
        // 4. REDIRECCIÓN
        if (rol === 'BARBERO') {
          this.router.navigate(['/barber-dashboard']);
        } else if (rol === 'CLIENTE') {
          this.router.navigate(['/my-appointments']);
        } else {
          // SUPER_ADMIN u otros roles: el frontend no tiene panel propio,
          // se queda en el inicio público
          this.router.navigate(['/barbers']);
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        alert('Credenciales inválidas, intenta nuevamente.');
      }
    });
  }
}