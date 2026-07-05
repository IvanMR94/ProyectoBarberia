import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  private api = inject(ApiService);
  private router = inject(Router);

  login() {
    this.api.login(this.credentials).subscribe({
      next: (res) => {
        // Guardamos el token en localStorage
        localStorage.setItem('token', res.access);
        alert('¡Bienvenido!');
        // Redirigimos a la lista de barberos o a citas
        this.router.navigate(['/barbers']);
      },
      error: (err) => {
        console.error('Error de login:', err);
        alert('Usuario o contraseña incorrectos.');
      }
    });
  }
}