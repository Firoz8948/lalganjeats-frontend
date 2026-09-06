export interface Restaurant {
  id: number;
  name: string;
  slug?: string | null;
  cuisine: string;
  rating: number;
  review_count: number;
  delivery_time: string;
  delivery_fee: string;
  delivery_charge: number;
  min_order: string;
  is_open: boolean;
  offer_text?: string | null;
  image_emoji: string;
  image_bg: string;
  logo_url?: string | null;
  list_banner_url?: string | null;
  banner_url?: string | null;
  banner_mobile_url?: string | null;
  address?: string | null;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  show_packing_charge?: boolean;
  packing_charge?: number;
}

export interface RestaurantCreatePayload {
  name: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string;
  list_banner_url?: string;
  banner_url?: string;
  banner_mobile_url?: string;
  owner_phone: string;
  owner_name?: string;
  owner_username?: string;
  owner_password?: string;
  business_category_id?: number | null;
  is_approved?: boolean;
  show_packing_charge?: boolean;
  packing_charge?: number | null;
}

export interface RestaurantUpdatePayload {
  name?: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  list_banner_url?: string | null;
  banner_url?: string | null;
  banner_mobile_url?: string | null;
  is_open?: boolean;
  is_approved?: boolean;
  is_active?: boolean;
  owner_name?: string | null;
  owner_username?: string | null;
  owner_password?: string | null;
  business_category_id?: number | null;
  show_packing_charge?: boolean;
  packing_charge?: number | null;
}

export interface AdminRestaurantRow {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  owner?: string | null;
  owner_phone?: string | null;
  owner_username?: string | null;
  has_password?: boolean;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  list_banner_url?: string | null;
  banner_url?: string | null;
  banner_mobile_url?: string | null;
  business_category_id?: number | null;
  business_category?: string | null;
  is_open: boolean;
  is_approved: boolean;
  is_active: boolean;
  show_packing_charge?: boolean;
  packing_charge?: number | null;
  created_at?: string;
}
