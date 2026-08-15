// features/profile/components/profile-shell/profile-shell.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../../home/components/navbar/navbar.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { AuthService } from '../../../../core/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-profile-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './profile-shell.component.html',
  styleUrl:    './profile-shell.component.scss'
})
export class ProfileShellComponent {
  auth = inject(AuthService);
  get user()            { return this.auth.currentUser(); }
  get displayGreeting() { return this.auth.displayGreeting(); }
  get avatarInitial()   { return this.auth.avatarInitial(); }
}
