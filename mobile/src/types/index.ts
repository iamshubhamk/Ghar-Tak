export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'customer' | 'provider' | 'admin';

export type VerificationStatus = 'VERIFIED' | 'PENDING_VERIFICATION' | 'REJECTED' | 'DISABLED' | 'pending' | 'verified' | 'rejected' | 'disabled';
export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'online' | 'offline' | 'busy';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_PROVIDER'
  | 'CANCELLED_BY_ADMIN'
  | 'pending_acceptance'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';


export interface CustomerProfile {
  default_address?: string | null;
  default_locality?: string | null;
  profile_photo_url?: string | null;
}

export interface ProviderProfile {
  bio?: string | null;
  experience_years: number;
  verification_status: VerificationStatus;
  rejection_reason?: string | null;
  profile_photo_url?: string | null;
  adhaar_card_url?: string | null;
  availability_status: AvailabilityStatus;
  price_note?: string | null;
  average_rating: number;
  total_reviews: number;
  is_public: boolean;
  categories: string[];
  localities: string[];
}

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  customer_profile?: CustomerProfile | null;
  provider_profile?: ProviderProfile | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
}

export interface ProviderItem {
  id: string;
  name: string;
  bio?: string | null;
  experience_years: number;
  average_rating: number;
  total_reviews: number;
  profile_photo_url?: string | null;
  price_note?: string | null;
  availability_status: AvailabilityStatus;
  categories: string[];
  localities: string[];
  phone?: string | null;
}

export interface BookingItem {
  id: string;
  customer_id: string;
  provider_id?: string | null;
  category_id: string;
  category_name?: string | null;
  provider_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  provider_phone?: string | null;
  service_address: string;
  locality: string;
  preferred_schedule?: string | null;
  issue_description?: string | null;
  status: BookingStatus;
  total_price?: number | null;
  issue_photo_url?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ReviewItem {
  id: string;
  booking_id: string;
  provider_id: string;
  customer_id: string;
  customer_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  event_type: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

