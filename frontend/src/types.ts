export interface Mailbox {
  id: string;
  address: string;
  token: string;
  created_at: number;
  last_refreshed_at: number;
  expires_at: number;
  can_refresh: boolean;
  next_refresh_at: number;
}

export interface Message {
  id: string;
  mailbox_address: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  body_html: string;
  size_bytes: number;
  date: string;
  created_at: number;
  is_read: boolean;
}

export interface WSMessageEvent {
  type: "new_message";
  message: Message;
}
