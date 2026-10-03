import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  private api = inject(ApiService);
  
  // Usamos señales para que la UI reaccione instantáneamente
  isLoggedIn = signal(false);
  esBarbero = signal(false);

  ngOnInit() {
    // Escuchamos el estado centralizado
    this.api.authStatus$.subscribe(status => {
      this.isLoggedIn.set(status);
      this.esBarbero.set(localStorage.getItem('rol') === 'BARBERO');
    });
  }

  logout() {
    this.api.logout(); // Usamos el método centralizado
  }
}