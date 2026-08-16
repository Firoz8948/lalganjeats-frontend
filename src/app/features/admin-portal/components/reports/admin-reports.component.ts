import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ReportChannel,
  ReportDeliveryHistory,
  ReportPeriod,
  ReportRecipient,
  ReportRequest,
  ReportSummary,
  ReportTargetType,
} from './report.models';
import { ReportService } from './report.service';


@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss',
})
export class AdminReportsComponent implements OnInit {
  recipients = signal<ReportRecipient[]>([]);
  summary = signal<ReportSummary | null>(null);
  history = signal<ReportDeliveryHistory[]>([]);
  loading = signal(false);
  action = signal('');
  error = signal('');
  success = signal('');

  targetType: ReportTargetType = 'restaurant';
  targetId: number | null = null;
  period: ReportPeriod = 'last_week';
  customStart = '';
  customEnd = '';
  destination = '';

  visibleRecipients = computed(() =>
    this.recipients().filter((row) => row.target_type === this.targetType),
  );

  constructor(private reports: ReportService) {}

  ngOnInit() {
    this.loading.set(true);
    this.reports.recipients().subscribe({
      next: (rows) => {
        this.recipients.set(rows);
        this.selectFirstRecipient();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load report recipients.');
        this.loading.set(false);
      },
    });
    this.loadHistory();
  }

  changeTargetType(type: ReportTargetType) {
    this.targetType = type;
    this.summary.set(null);
    this.selectFirstRecipient();
  }

  selectFirstRecipient() {
    const first = this.recipients().find(
      (row) => row.target_type === this.targetType && row.is_active,
    );
    this.targetId = first?.id ?? null;
    this.destination = '';
  }

  onTargetChanged() {
    this.summary.set(null);
    this.destination = '';
  }

  selectedRecipient(): ReportRecipient | undefined {
    return this.recipients().find(
      (row) => row.target_type === this.targetType && row.id === Number(this.targetId),
    );
  }

  private payload(): ReportRequest | null {
    this.error.set('');
    this.success.set('');
    if (!this.targetId) {
      this.error.set('Choose a restaurant or delivery partner.');
      return null;
    }
    const payload: ReportRequest = {
      target_type: this.targetType,
      target_id: Number(this.targetId),
      period: this.period,
    };
    if (this.period === 'custom') {
      if (!this.customStart || !this.customEnd) {
        this.error.set('Choose both custom start and end dates.');
        return null;
      }
      payload.custom_start = new Date(`${this.customStart}T00:00:00`).toISOString();
      payload.custom_end = new Date(`${this.customEnd}T23:59:59.999`).toISOString();
    }
    return payload;
  }

  preview() {
    const payload = this.payload();
    if (!payload) return;
    this.action.set('preview');
    this.reports.preview(payload).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.action.set('');
      },
      error: (error) => this.fail(error, 'Could not generate the report preview.'),
    });
  }

  download() {
    const payload = this.payload();
    if (!payload) return;
    this.action.set('download');
    this.reports.download(payload).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const name = this.selectedRecipient()?.name || 'partner';
        anchor.href = url;
        anchor.download = `lalganjeats-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-report.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.action.set('');
        this.success.set('PDF report downloaded.');
      },
      error: (error) => this.fail(error, 'Could not download the PDF report.'),
    });
  }

  send(channel: ReportChannel) {
    const payload = this.payload();
    if (!payload) return;
    const target = this.selectedRecipient();
    const recipient = this.destination.trim()
      || (channel === 'email' ? target?.email : target?.phone)
      || '';
    if (!recipient) {
      this.error.set(
        `No ${channel === 'email' ? 'email address' : 'WhatsApp number'} is saved. Enter one below.`,
      );
      return;
    }
    const label = channel === 'email' ? 'email' : 'WhatsApp';
    if (!window.confirm(`Send this report to ${recipient} by ${label}?`)) return;
    this.action.set(channel);
    this.reports.send(payload, channel, recipient).subscribe({
      next: () => {
        this.action.set('');
        this.success.set(`Report sent by ${label}.`);
        this.loadHistory();
      },
      error: (error) => this.fail(error, `Could not send the report by ${label}.`),
    });
  }

  loadHistory() {
    this.reports.history().subscribe({
      next: (rows) => this.history.set(rows),
      error: () => {},
    });
  }

  private fail(error: any, fallback: string) {
    this.action.set('');
    this.error.set(
      typeof error?.error?.detail === 'string' ? error.error.detail : fallback,
    );
  }
}
