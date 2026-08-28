import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteLoaderComponent } from './shared/route-loader/route-loader.component';
import { SeoService } from './core/services/seo.service';
import { CustomerNotificationService } from './core/services/customer-notification.service';
import { LiveUpdateService } from './core/services/live-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouteLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'LalganjEats';

  constructor(
    seo: SeoService,
    notif: CustomerNotificationService,
    liveUpdate: LiveUpdateService,
  ) {
    seo.start();
    notif.init();
    liveUpdate.checkForUpdates();
  }
}
