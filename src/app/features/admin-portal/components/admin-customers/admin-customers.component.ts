import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { AdminService } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-customers.component.html',
  styleUrl: './admin-customers.component.scss',
})
export class AdminCustomersComponent implements OnInit {
  customers = signal<any[]>([]);

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getCustomers().subscribe((data) => this.customers.set(data));
  }
}
