import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  template: `
    <main class="placeholder">
      <h1>{{ title }}</h1>
      <p>Coming soon</p>
    </main>
  `,
  styles: [`
    .placeholder {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }
  `],
})
export class PlaceholderComponent {
  @Input() title = 'LalganjEats';
}
