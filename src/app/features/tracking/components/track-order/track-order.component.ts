/// <reference types="google.maps" />
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderLiveMapComponent } from '../order-live-map/order-live-map.component';

@Component({
  selector: 'app-track-order',
  standalone: true,
  imports: [CommonModule, RouterLink, OrderLiveMapComponent],
  templateUrl: './track-order.component.html',
  styleUrl: './track-order.component.scss',
})
export class TrackOrderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  orderId = signal(0);

  ngOnInit() {
    this.orderId.set(Number(this.route.snapshot.paramMap.get('id')));
  }
}
