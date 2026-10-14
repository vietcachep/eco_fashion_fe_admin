import type { CurrentUserResponse } from "@/lib/api/generated/model";

/*
 * Kiểu tay còn lại của module `shop`: phần Orval chưa sinh được. Mọi DTO gian hàng/ví/đối soát đã dùng kiểu sinh từ
 * `@/lib/api/generated/model` — KHÔNG thêm lại DTO tay ở đây.
 */

export type ShopStatus = "pending" | "approved" | "suspended" | "rejected";
export type ShopMemberRole = "shop_owner" | "shop_staff";
export type ShopMemberStatus = "active" | "removed";

/*
 * Tóm tắt "đang là thành viên gian hàng nào" — RoleGuard (components/layout/route-guards.tsx) dùng để quyết định vào
 * `/vendor/**` được hay không. Field NÀY chưa có trong `CurrentUserResponse` do Orval sinh (`/auth/me` không trả kèm) —
 * ép kiểu tạm DUY NHẤT ở `features/shop/hooks/use-shop-membership.ts`, xoá khi backend trả field thật.
 */
export interface ShopMembershipSummary {
  shopId: string;
  shopName: string;
  role: ShopMemberRole;
  status: ShopMemberStatus;
  /** Trạng thái GIAN HÀNG (khác `status` của thành viên) — shop chưa duyệt/bị khoá thì mọi route /shop/** bị 403. */
  shopStatus: ShopStatus;
}

export type CurrentUserWithShop = CurrentUserResponse & {
  shopMemberships?: ShopMembershipSummary[];
};
