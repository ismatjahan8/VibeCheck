import { api } from "./client";

export type Contact = {
  id: number;
  user_id: number;
  email: string;
  display_name: string;
  avatar_url?: string | null;
};

export type Conversation = {
  id: number;
  type: "direct" | "group";
  title?: string | null;
  member_user_ids: number[];
};

export type Attachment = {
  id: number;
  kind: string;
  url: string;
  mime_type?: string | null;
  size?: number | null;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  attachments: Attachment[];
};

export async function listContacts() {
  const { data } = await api.get("/contacts");
  return data as Contact[];
}

export async function addContact(email: string) {
  const { data } = await api.post("/contacts", { email });
  return data as Contact;
}

export async function listConversations() {
  const { data } = await api.get("/conversations");
  return data as Conversation[];
}

export async function createConversation(type: "direct" | "group", member_user_ids: number[], title?: string) {
  const { data } = await api.post("/conversations", { type, member_user_ids, title: title ?? null });
  return data as Conversation;
}

export async function listMessages(conversationId: number) {
  const { data } = await api.get(`/messages/conversation/${conversationId}`);
  return data as Message[];
}

export async function sendMessage(conversationId: number, body: string, attachment_ids: number[] = []) {
  const { data } = await api.post(`/messages/conversation/${conversationId}`, { body, attachment_ids });
  return data as Message;
}

export async function updateReceipt(messageId: number, status: "delivered" | "read") {
  const { data } = await api.post(`/messages/${messageId}/receipt`, { status });
  return data as { ok: boolean };
}

export async function presignUpload(content_type: string, filename: string, kind: string) {
  const { data } = await api.post(`/uploads/presign`, { content_type, filename, kind });
  return data as {
    upload_method: string;
    upload_url: string;
    upload_headers: Record<string, string>;
    attachment_id: number;
    public_url: string;
  };
}

