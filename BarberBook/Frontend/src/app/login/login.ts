import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule], // Cambiamos FormsModule por ReactiveFormsModule
  templateUrl: './login.html'
})
export class LoginComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Definimos el formulario con validaciones profesionales
  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Marca todo como tocado para mostrar errores
      return;
    }

    this.api.login(this.loginForm.value).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.access);
        this.api.updateAuthStatus();
        this.router.navigate(['/barbers']);
      },
      error: () => alert('Credenciales inválidas, intenta nuevamente.')
    });
  }
}