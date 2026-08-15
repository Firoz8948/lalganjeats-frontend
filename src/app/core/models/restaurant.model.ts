export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  rating: number;
  review_count: number;
  delivery_time: string;
  delivery_fee: string;
  min_order: string;
  is_open: boolean;
  offer_text?: string | null;
  image_emoji: string;
  image_bg: string;
  logo_url?: string | null;
  list_banner_url?: string | null;
  banner_url?: string | null;
  address?: string | null;
  city?: string;
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
  owner_phone: string;
  owner_name?: string;
  is_approved?: boolean;
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
  is_open?: boolean;
  is_approved?: boolean;
  is_active?: boolean;
  owner_name?: string | null;
}

export interface AdminRestaurantRow {
  id: number;
  name: string;
  description?: string | null;
  owner?: string | null;
  owner_phone?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  list_banner_url?: string | null;
  banner_url?: string | null;
  is_open: boolean;
  is_approved: boolean;
  is_active: boolean;
  created_at?: string;
}
