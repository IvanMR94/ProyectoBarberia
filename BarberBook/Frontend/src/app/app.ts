import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar';
import { ToastContainerComponent } from './shared/toast-container';
import { DialogComponent } from './shared/dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent, DialogComponent],
  templateUrl: './app.html',
})
export class App {
}