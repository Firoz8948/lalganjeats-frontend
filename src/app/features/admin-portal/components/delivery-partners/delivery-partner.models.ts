export type DeliveryDocumentPurpose = 'rc' | 'aadhaar' | 'pan' | 'bank_passbook';
export type DeliveryUploadPurpose = 'selfie' | DeliveryDocumentPurpose;

export interface DeliveryPartnerPublic {
  name: string;
  selfie_url: string | null;
  registered_vehicle_number: string | null;
  bike_info: string | null;
}

export interface DeliveryPartner {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  username?: string | null;
  has_password?: boolean;
  is_active: boolean;
  profile_complete: boolean;
  date_of_birth: string | null;
  age: number | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  joining_date: string | null;
  registered_vehicle_number: string | null;
  bike_info: string | null;
  selfie_url: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  bank_name: string | null;
  documents: Record<DeliveryDocumentPurpose, boolean>;
  created_at: string | null;
  allow_multiple_orders?: boolean;
}

export interface DeliveryPartnerCreate {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  joining_date: string;
  registered_vehicle_number: string;
  bike_info: string;
  selfie_url: string;
  rc_document_key: string | null;
  aadhaar_document_key: string | null;
  pan_document_key: string | null;
  bank_passbook_document_key: string | null;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  username?: string;
  password?: string;
}

export interface DeliveryUploadResult {
  purpose: DeliveryUploadPurpose;
  url: string | null;
  document_key: string | null;
}
