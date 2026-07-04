import { BookingStatus } from "./booking";

export type BookingStatusCount = {
  status: BookingStatus;
  count: number;
};

export type AdminDashboardSummary = {
  total_customers: number;
  total_providers: number;
  pending_providers: number;
  verified_providers: number;
  total_bookings: number;
  open_bookings: number;
  completed_bookings: number;
  booking_status_counts: BookingStatusCount[];
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "CUSTOMER";
  is_active: boolean;
  default_address: string | null;
  default_locality: string | null;
  created_at: string;
};

