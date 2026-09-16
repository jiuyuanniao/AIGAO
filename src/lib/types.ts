// 领域模型定义。字段命名与后续 Supabase/PostgreSQL 表结构保持一致，
// 便于 V2 直接替换 mock 数据为数据库查询（含 RLS）。

export type RequestStatus =
  | "draft"
  | "recruiting"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ApplicationStatus =
  | "submitted"
  | "selected"
  | "not_selected"
  | "withdrawn"
  | "invalid";

export type OrderStatus =
  | "pending_confirm"
  | "in_progress"
  | "pending_review"
  | "revision_required"
  | "completed"
  | "cancelled"
  | "disputed";

export type MediaType = "image" | "video";

export interface User {
  id: string;
  name: string;
  avatar_url: string;
  is_creator: boolean;
  city?: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  cover_url: string;
  tagline: string;
  bio: string;
  verified: boolean;
  specialties: string[];
  tools: string[];
  workflow: string[];
  rating: number;
  reviews_count: number;
  completed_orders: number;
  on_time_rate: number;
  response_minutes: number;
  price_from: number;
  city: string;
  joined_at: string;
}

export interface Portfolio {
  id: string;
  creator_id: string;
  title: string;
  cover_url: string;
  media_type: MediaType;
  category: string;
  tags: string[];
  likes: number;
  ratio: "tall" | "square" | "wide";
  description?: string;
}

export interface Service {
  id: string;
  creator_id: string;
  title: string;
  category: string;
  usage: string[]; // 用途：电商 / 品牌 / 社交媒体 ...
  cover_url: string;
  gallery: string[];
  price_from: number;
  delivery_days: number;
  quantity: string;
  revisions: number;
  commercial_use: boolean;
  source_files: boolean;
  media_type: MediaType;
  description: string;
  process: { title: string; detail: string }[];
  before_after?: { before: string; after: string; note: string };
  orders_count: number;
  rating: number;
}

export interface CreatorRequest {
  id: string;
  title: string;
  owner_name: string;
  owner_avatar: string;
  owner_kind: string;
  category: string;
  media_type: MediaType | "mixed";
  description: string;
  deliverables: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
  created_at: string;
  status: RequestStatus;
  applications_count: number;
  views: number;
  attachments: string[];
  requirements: {
    commercial_use: boolean;
    retouch: boolean;
    consistency: boolean;
    source_files: boolean;
  };
}

export interface Application {
  id: string;
  request_id: string;
  creator_id: string;
  status: ApplicationStatus;
  quote: number;
  duration_days: number;
  plan: string;
  cases: string[];
  created_at: string;
}

export interface DeliveryFile {
  name: string;
  thumb: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  version: number;
  note: string;
  files: DeliveryFile[];
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  author: "buyer" | "creator" | "system";
  author_name: string;
  content: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_no: string;
  request_id?: string;
  service_id?: string;
  creator_id: string;
  buyer_name: string;
  buyer_avatar: string;
  title: string;
  status: OrderStatus;
  // 成交快照
  amount: number;
  scope: string;
  revisions_total: number;
  revisions_used: number;
  deadline: string;
  commercial_use: boolean;
  source_files: boolean;
  created_at: string;
  deliveries: Delivery[];
  messages: Message[];
}

export interface Review {
  id: string;
  creator_id: string;
  order_id: string;
  author_name: string;
  author_avatar: string;
  rating: number;
  content: string;
  tags: string[];
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  target_type: "service" | "creator" | "portfolio";
  target_id: string;
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "草稿",
  recruiting: "招募中",
  matched: "已选定",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "已应征",
  selected: "已选中",
  not_selected: "未选中",
  withdrawn: "已撤回",
  invalid: "已失效",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_confirm: "待接单",
  in_progress: "制作中",
  pending_review: "待验收",
  revision_required: "修改中",
  completed: "已完成",
  cancelled: "已取消",
  disputed: "纠纷处理",
};