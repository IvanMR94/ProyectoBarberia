import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent {
  private api = inject(ApiService);
  private router = inject(Router);
  
  // Usamos señal para que Angular sepa cuándo redibujar el HTML
  isLoggedIn = signal(!!localStorage.getItem('token'));

  constructor() {
    // Escuchamos el canal de noticias del servicio
    this.api.authStatus$.subscribe(status => {
      this.isLoggedIn.set(status);
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.api.updateAuthStatus(); // <--- ¡Avisamos que cerramos sesión!
    this.router.navigate(['/login']);
  }
}