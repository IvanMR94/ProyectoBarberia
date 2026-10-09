import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { logError } from '../utils/log';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  user = { nombre: '', apellido: '', email: '', password: '' };

  registrar() {
    if (this.user.password.length < 8) {
      this.toast.aviso('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const payload = {
      username: this.user.email, 
      email: this.user.email,
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      password: this.user.password,
    };

    // Muestro solo un indicador genérico, sin datos sensibles
    console.log('Enviando solicitud de registro al backend');

    this.api.register(payload).subscribe({
      next: () => {
        this.toast.exito('¡Registro exitoso! Ya puedes iniciar sesión.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        logError('register', err);
        const detalle = err?.error;
        let mensaje = 'No se pudo completar el registro. Intentá de nuevo.';
        if (detalle && typeof detalle === 'object') {
          const primerError = Object.values(detalle).flat()[0];
          if (typeof primerError === 'string') mensaje = primerError;
        }
        this.toast.error(mensaje);
      }
    });
  }
}