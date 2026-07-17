import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../services/api';
import { CommonModule } from '@angular/common'; // Importante

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.html'
})
export class NavbarComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  
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