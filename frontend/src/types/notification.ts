export type Notification = {
  id: string;
  user_id: string | null;
  role: string | null;
  title: string;
  message: string;
  event_type: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

