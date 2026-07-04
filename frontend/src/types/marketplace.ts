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
  user_id: string;
  name: string;
  phone: string | null;
  bio: string | null;
  experience_years: number;
  verification_status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "DISABLED";
  availability_status: "AVAILABLE" | "UNAVAILABLE";
  price_note: string | null;
  average_rating: number;
  total_reviews: number;
  is_public: boolean;
  categories: string[];
  localities: string[];
};
