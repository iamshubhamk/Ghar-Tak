export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};
