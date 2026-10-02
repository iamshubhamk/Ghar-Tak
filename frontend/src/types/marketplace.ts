export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  price_label: string | null;
  is_active: boolean;
  display_order: number;
};

export type ProviderProfile = {
  id: string;
  user_id?: string;
  name: string;
  phone?: string | null;
  bio: string | null;
  experience_years: number;
  verification_status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISABLED" | "SUSPENDED";
  availability_status: "AVAILABLE" | "UNAVAILABLE" | "BUSY" | "OFFLINE";
  price_note: string | null;
  average_rating: number;
  total_reviews: number;
  is_public: boolean;
  categories: string[];
  localities: string[];
  has_tools?: boolean;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  payout_upi_id?: string | null;
  bank_proof_url?: string | null;
  profile_photo_url?: string | null;
  adhaar_card_url?: string | null;
  rejection_reason?: string | null;
};

export type SkillRequest = {
  id: string;
  provider_id: string;
  provider_name: string;
  category_name: string;
  proof_url: string;
  notes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
};

