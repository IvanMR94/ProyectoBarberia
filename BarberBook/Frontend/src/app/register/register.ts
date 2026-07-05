import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  private api = inject(ApiService);
  private router = inject(Router);

  // Modelo sin hardcodear
  user = { nombre: '', apellido: '', email: '', password: '' };

  registrar() {
    this.api.register(this.user).subscribe({
      next: () => {
        alert('¡Registro exitoso! Ya puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => alert('Error al registrar: ' + (err.error.detail || 'Verifica tus datos'))
    });
  }
}