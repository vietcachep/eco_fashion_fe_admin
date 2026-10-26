import type { Money } from "@/types/common";

/* DTO module system — Swagger không khai schema response; chép từ backend `system/**`. */
export interface SettingRow {
  key: string;
  value: unknown;
  groupCode: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export interface ProvinceResponse {
  code: string;
  name: string;
  region: string;
  shippingFee: Money;
  isActive: boolean;
}

export interface BannerResponse {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface ContactResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  /** Gửi cho gian hàng nào (null = gửi sàn) */
  shopId: string | null;
  shopName: string | null;
  orderCode: string | null;
  productName: string | null;
  status: string;
  reply: string | null;
  handledAt: string | null;
  createdAt: string;
  /** Phía sàn: được trả lời không (tin gửi sàn, hoặc tin shop quá hạn chưa xử lý) */
  platformCanReply: boolean;
}

export interface FaqResponse {
  id: string;
  question: string;
  answer: string;
  groupCode: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PageResponseDto {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}
