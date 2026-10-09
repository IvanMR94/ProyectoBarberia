import { Component, OnInit, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api';
import { logError } from '../utils/log';

type Estado = 'validando' | 'valido' | 'invalido' | 'guardando' | 'listo';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html'
})
export class ResetPasswordComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  estado = signal<Estado>('validando');
  mensajeError = signal('');

  private uid = '';
  private token = '';

  form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    password2: ['', [Validators.required]],
  });

  ngOnInit() {
    this.uid = this.route.snapshot.paramMap.get('uid') ?? '';
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.uid || !this.token) {
      this.estado.set('invalido');
      return;
    }

    this.api.validarRecupero(this.uid, this.token).subscribe({
      next: () => this.estado.set('valido'),
      error: (err) => {
        if (err?.status === 429) {
          this.mensajeError.set(
            'Demasiados intentos. Esperá un rato y volvé a intentar.');
        }
        this.estado.set('invalido');
      },
    });
  }

  coincide(): boolean {
    return this.form.value.password === this.form.value.password2;
  }

  soloNumeros(): boolean {
    const pw = this.form.value.password || '';
    return pw.length > 0 && /^\d+$/.test(pw);
  }

  enviar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.coincide()) {
      return;
    }
    this.estado.set('guardando');
    this.mensajeError.set('');

    this.api.restablecerContrasena(
      this.uid, this.token, this.form.value.password,
    ).subscribe({
      next: () => this.estado.set('listo'),
      error: (err) => {
        this.estado.set('valido');
        if (err?.status === 400) {
          const detalle = err.error?.detail;
          this.mensajeError.set(
            typeof detalle === 'string'
              ? detalle
              : 'La contraseña no cumple los requisitos.');
        } else if (err?.status === 429) {
          this.mensajeError.set(
            'Demasiados intentos. Esperá un rato y volvé a intentar.');
        } else {
          logError('reset-password', err);
          this.mensajeError.set('No se pudo guardar. Intentá de nuevo.');
        }
      },
    });
  }

  irAlLogin() {
    this.router.navigate(['/login']);
  }
}
