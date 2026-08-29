import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BroadcastNotificationsService,
  BroadcastPayload,
  BroadcastResult
} from './broadcast-notifications.service';

@Component({
  selector: 'app-broadcast-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './broadcast-notifications.component.html',
  styleUrl: './broadcast-notifications.component.scss'
})
export class BroadcastNotificationsComponent {
  private broadcastService = inject(BroadcastNotificationsService);

  title = '';
  body = '';
  targetAudience: 'all' | 'customers' | 'restaurant_owners' | 'delivery_partners' = 'customers';
  imageUrl = '';
  deepLink = '';

  sending = signal(false);
  error = signal('');
  successResult = signal<BroadcastResult | null>(null);

  // Clean Quick Preset Templates without emojis
  templates = [
    {
      label: 'Khana Khaoge Promo',
      title: 'Khana Khaoge? Special Food Offers',
      body: 'Order delicious food from Lalganj top restaurants! Use code LALGANJ20 for flat 20% off.',
      target: 'customers' as const
    },
    {
      label: 'Lunch Rush Special',
      title: 'Hungry? Fresh Lunch Specials!',
      body: 'Get your favorite lunch delivered hot and fresh to your doorstep in 30 minutes.',
      target: 'customers' as const
    },
    {
      label: 'Delivery Surge Alert',
      title: 'High Order Demand in Lalganj',
      body: 'Orders are surging across Lalganj. Go online now to receive orders and earn extra payouts.',
      target: 'delivery_partners' as const
    },
    {
      label: 'Restaurant Kitchen Reminder',
      title: 'Keep Your Menu & Kitchen Active',
      body: 'Orders are peaking this evening. Ensure all your popular items are marked in stock and ready.',
      target: 'restaurant_owners' as const
    }
  ];

  applyTemplate(t: typeof this.templates[0]) {
    this.title = t.title;
    this.body = t.body;
    this.targetAudience = t.target;
    this.error.set('');
    this.successResult.set(null);
  }

  sendNotification() {
    if (!this.title.trim()) {
      this.error.set('Please enter a notification title.');
      return;
    }
    if (!this.body.trim()) {
      this.error.set('Please enter the notification message body.');
      return;
    }

    this.sending.set(true);
    this.error.set('');
    this.successResult.set(null);

    const payload: BroadcastPayload = {
      title: this.title.trim(),
      body: this.body.trim(),
      target_audience: this.targetAudience,
      image_url: this.imageUrl.trim() || undefined,
      deep_link: this.deepLink.trim() || undefined,
    };

    this.broadcastService.send(payload).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.successResult.set(res);
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err.error?.detail || 'Failed to send notification. Please try again.');
      }
    });
  }

  resetForm() {
    this.title = '';
    this.body = '';
    this.imageUrl = '';
    this.deepLink = '';
    this.successResult.set(null);
    this.error.set('');
  }
}
