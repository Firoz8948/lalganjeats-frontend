import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { PagedHistoryComponent, HistoryColumn } from '../../../../shared/paged-history/paged-history.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  EarningsService,
  EarningsSummary,
  BankAccount,
  Withdrawal,
} from '../../../../core/services/earnings.service';

@Component({
  selector: 'app-hp-earnings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PortalPageHeaderComponent, PagedHistoryComponent],
  templateUrl: './hp-earnings.component.html',
  styleUrl: './hp-earnings.component.scss',
})
export class HpEarningsComponent implements OnInit {
  summary: EarningsSummary | null = null;
  bankAccounts: BankAccount[] = [];
  withdrawalHistory: Withdrawal[] = [];

  withdrawForm!: FormGroup;
  bankForm!: FormGroup;

  showBankForm = false;
  showWithdrawModal = false;
  loading = true;
  withdrawing = false;
  addingBank = false;

  successMsg = '';
  errorMsg = '';

  readonly settlementColumns: HistoryColumn[] = [
    { key: 'settled_at', label: 'Date', kind: 'datetime' },
    { key: 'order_count', label: 'Orders' },
    { key: 'amount', label: 'Amount', kind: 'money' },
  ];

  loadSettlements = (page: number) => this.earningsService.getRestaurantSettlementHistory(page);

  constructor(
    private fb: FormBuilder,
    private earningsService: EarningsService
  ) {}

  ngOnInit(): void {
    this.withdrawForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
    });

    this.bankForm = this.fb.group({
      account_holder_name: ['', Validators.required],
      account_number: ['', [Validators.required, Validators.minLength(9)]],
      ifsc_code: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
    });

    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.earningsService.getRestaurantEarnings().subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });

    this.earningsService.getBankAccounts().subscribe({
      next: (data) => (this.bankAccounts = data),
    });

    this.earningsService.getWithdrawalHistory().subscribe({
      next: (data) => (this.withdrawalHistory = data),
    });
  }

  get primaryBank(): BankAccount | undefined {
    return this.bankAccounts.find((b) => b.is_primary);
  }

  openWithdrawModal(): void {
    this.errorMsg = '';
    if (!this.primaryBank) {
      this.errorMsg = 'Please add a bank account first';
      return;
    }
    this.showWithdrawModal = true;
    this.withdrawForm.reset();
  }

  submitWithdrawal(): void {
    if (this.withdrawForm.invalid) return;
    const amount = this.withdrawForm.get('amount')?.value;

    if (amount > (this.summary?.available_balance || 0)) {
      this.errorMsg = 'Amount exceeds available balance';
      return;
    }

    this.withdrawing = true;
    this.earningsService.requestWithdrawal(amount).subscribe({
      next: () => {
        this.withdrawing = false;
        this.showWithdrawModal = false;
        this.successMsg = `Withdrawal of ₹${amount} requested successfully`;
        this.loadAll();
        setTimeout(() => (this.successMsg = ''), 4000);
      },
      error: (err) => {
        this.withdrawing = false;
        this.errorMsg = err.error?.detail || 'Withdrawal failed';
      },
    });
  }

  submitBankAccount(): void {
    if (this.bankForm.invalid) return;
    this.addingBank = true;

    const payload = {
      ...this.bankForm.value,
      ifsc_code: String(this.bankForm.value.ifsc_code).toUpperCase(),
    };

    this.earningsService.addBankAccount(payload).subscribe({
      next: () => {
        this.addingBank = false;
        this.showBankForm = false;
        this.successMsg = 'Bank account added successfully';
        this.loadAll();
        setTimeout(() => (this.successMsg = ''), 4000);
      },
      error: (err) => {
        this.addingBank = false;
        this.errorMsg = err.error?.detail || 'Failed to add bank account';
      },
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      failed: 'status-failed',
    };
    return map[status] || '';
  }
}
