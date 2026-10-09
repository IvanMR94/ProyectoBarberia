import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api';
import { logError } from '../utils/log';

type Estado = 'idle' | 'enviando' | 'listo';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html'
})
export class ForgotPasswordComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  estado = signal<Estado>('idle');
  mensajeError = signal('');
  // Solo en desarrollo el backend devuelve el link para probar sin SMTP.
  linkPrueba = signal('');

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.estado.set('enviando');
    this.mensajeError.set('');
    this.linkPrueba.set('');

    this.api.solicitarRecupero(this.form.value.email.trim()).subscribe({
      next: (res) => {
        this.estado.set('listo');
        if (res?.link) {
          this.linkPrueba.set(res.link);
        }
      },
      error: (err) => {
        this.estado.set('idle');
        if (err?.status === 429) {
          this.mensajeError.set(
            'Demasiadas solicitudes. Esperá un rato y volvé a intentar.');
        } else {
          logError('forgot-password', err);
          this.mensajeError.set(
            'No se pudo procesar la solicitud. Intentá de nuevo.');
        }
      },
    });
  }
}
