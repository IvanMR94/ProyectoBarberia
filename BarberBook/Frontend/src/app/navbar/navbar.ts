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
  
  isLoggedIn = signal(!!localStorage.getItem('token'));
  esBarbero = signal(localStorage.getItem('rol') === 'BARBERO');

  constructor() {
    this.api.authStatus$.subscribe(status => {
      this.isLoggedIn.set(status);
      this.esBarbero.set(localStorage.getItem('rol') === 'BARBERO');
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    this.api.updateAuthStatus();
    this.router.navigate(['/login']);
  }
}