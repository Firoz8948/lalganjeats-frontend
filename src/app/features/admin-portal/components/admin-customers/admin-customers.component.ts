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
  updatingId = signal<number | null>(null);

  constructor(private admin: AdminService) {}

  ngOnInit() {
    this.admin.getCustomers().subscribe((data) => this.customers.set(data));
  }

  toggleStatus(customer: any) {
    const nextActive = !customer.is_active;
    const action = nextActive ? 'reactivate' : 'suspend';
    if (!confirm(
      `Are you sure you want to ${action} ${customer.full_name || customer.phone}?`
      + (!nextActive
        ? '\n\nUse suspension only after reviewing refusal, fraud or policy violations.'
        : ''),
    )) return;
    this.updatingId.set(customer.id);
    this.admin.setCustomerStatus(customer.id, nextActive).subscribe({
      next: () => {
        this.customers.update((rows) => rows.map((row) =>
          row.id === customer.id ? { ...row, is_active: nextActive } : row,
        ));
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }
}
