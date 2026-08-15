import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteLoaderComponent } from './shared/route-loader/route-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouteLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'LalganjEats';
}
