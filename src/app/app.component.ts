import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteLoaderComponent } from './shared/route-loader/route-loader.component';
import { SeoService } from './core/services/seo.service';
import { CustomerNotificationService } from './core/services/customer-notification.service';
import { CustomerLocationService } from './core/services/customer-location.service';
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
    location: CustomerLocationService,
    liveUpdate: LiveUpdateService,
  ) {
    seo.start();
    notif.init();
    // Kick off silent GPS detection as early as possible — the manual
    // location modal in the navbar will wait for this to finish before
    // showing itself, so most customers never see it.
    void location.initAutoDetect();
    liveUpdate.checkForUpdates();
  }
}
