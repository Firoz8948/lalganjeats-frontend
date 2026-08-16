export type ReportTargetType = 'restaurant' | 'delivery_partner';
export type ReportPeriod = 'daily' | 'last_week' | 'last_month' | 'overall' | 'custom';
export type ReportChannel = 'email' | 'whatsapp';

export interface ReportRecipient {
  id: number;
  target_type: ReportTargetType;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface ReportRequest {
  target_type: ReportTargetType;
  target_id: number;
  period: ReportPeriod;
  custom_start?: string;
  custom_end?: string;
}

export interface ReportSummary {
  target_type: ReportTargetType;
  target_id: number;
  target_name: string;
  period: ReportPeriod;
  period_label: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  order_count: number;
  delivered_orders: number;
  cancelled_orders: number;
  gross_order_value: number;
  discounts: number;
  delivery_fees: number;
  platform_charges: number;
  gross_earnings: number;
  platform_fees: number;
  settled_amount: number;
  unsettled_amount: number;
  settled_orders: number;
  unsettled_orders: number;
}

export interface ReportDeliveryHistory {
  id: number;
  target_type: ReportTargetType;
  target_name: string;
  period: ReportPeriod;
  channel: ReportChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}
