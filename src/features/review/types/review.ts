/* DTO đánh giá khu quản trị — chép từ backend `review/review.service.ts`. */
export interface MediaItem {
  type: string;
  url: string;
  name: string;
}

export interface ReviewAdminResponse {
  id: string;
  productId: string;
  author: string;
  avatarUrl: string | null;
  rating: number;
  content: string;
  variantLabel: string | null;
  media: MediaItem[];
  images: string[];
  reply: { staffName: string; content: string; createdAt: string } | null;
  createdAt: string;
  userId: string;
  productSlug: string;
  productName: string;
  orderCode: string | null;
  status: string;
  moderationNote: string | null;
  helpfulCount: number;
}
