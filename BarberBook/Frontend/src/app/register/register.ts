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

  user = { nombre: '', apellido: '', email: '', password: '' };

  registrar() {
    if (this.user.password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const payload = {
      username: this.user.email, 
      email: this.user.email,
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      password: this.user.password,
    };

    console.log('Enviando al backend:', payload);

    this.api.register(payload).subscribe({
      next: () => {
        alert('¡Registro exitoso! Ya puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error detallado:', err);
        alert('Error al registrar: ' + JSON.stringify(err.error));
      }
    });
  }
}