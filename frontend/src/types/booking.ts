export type BookingStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ON_THE_WAY"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_BY_CUSTOMER"
  | "CANCELLED_BY_PROVIDER"
  | "CANCELLED_BY_ADMIN";

export type BookingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type Booking = {
  id: string;
  customer_id: string;
  customer_name: string;
  provider_id: string | null;
  provider_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  category_id: string;
  category_name: string;
  address: string;
  locality: string;
  house_number?: string | null;
  building_name?: string | null;
  landmark?: string | null;
  pincode?: string | null;
  preferred_datetime: string;
  issue_description: string;
  items?: BookingItem[];
  status: BookingStatus;
  payment_mode: "CASH_ON_SERVICE" | "ONLINE";
  payment_status: "NOT_APPLICABLE_YET" | "CASH_PENDING" | "PAID_CASH" | "DISPUTED";
  final_amount: number | null;
  total_amount?: number | null;
  otp?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Review = {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  status: "VISIBLE" | "HIDDEN_BY_ADMIN";
  created_at: string;
  updated_at: string;
};
