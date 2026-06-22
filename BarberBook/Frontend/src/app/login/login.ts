import { Component, inject } from '@angular/core';
import { ApiService } from '../services/api';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-6">
      <input [(ngModel)]="username" placeholder="Usuario" class="border p-2">
      <input [(ngModel)]="password" type="password" placeholder="Contraseña" class="border p-2">
      <button (click)="login()" class="bg-blue-600 text-white p-2">Ingresar</button>
    </div>
  `
})
export class LoginComponent {
  username = ''; password = '';
  private api = inject(ApiService);

  login() {
  const credentials = {
    username: this.username,
    password: this.password
  };

  this.api.login(credentials).subscribe({
    next: (res) => {
      localStorage.setItem('token', res.access);
      alert('Login exitoso');
    },
    error: (err) => console.error('Error de login:', err)
  });
}
}