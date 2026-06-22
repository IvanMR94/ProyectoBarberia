import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-white border-b border-sky-100 shadow-sm p-4">
  <div class="max-w-5xl mx-auto flex justify-between items-center">
    <h1 class="text-xl font-bold text-blue-600">BarberBook</h1>
    
    <div class="flex gap-4">
      <a routerLink="/barbers" routerLinkActive="text-blue-600 font-bold" class="text-blue-800 hover:text-blue-500 transition">Agenda</a>
      <a routerLink="/my-appointments" routerLinkActive="text-blue-600 font-bold" class="text-blue-800 hover:text-blue-500 transition">Mis Citas</a>
      <a routerLink="/login" class="bg-blue-600 text-white px-4 py-1 rounded-full hover:bg-blue-700 transition">Login</a>
    </div>
  </div>
</nav>
  `
})
export class NavbarComponent {}