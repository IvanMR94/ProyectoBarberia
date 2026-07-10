import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
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
        // Aseguramos que rol tenga un valor por defecto si res.rol llegara a fallar
        const rol = res.rol || 'CLIENTE';
        
        localStorage.setItem('token', res.access);
        localStorage.setItem('rol', rol);
        
        this.api.updateAuthStatus();
        
        if (rol === 'BARBERO') {
          this.router.navigate(['/barber-dashboard']);
        } else {
          this.router.navigate(['/my-appointments']);
        }
      },
      error: () => alert('Credenciales inválidas, intenta nuevamente.')
    });
  }
}