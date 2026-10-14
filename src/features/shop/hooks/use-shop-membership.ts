"use client";

import { useCurrentUser } from "@/features/identity/hooks/use-current-user";
import type { ShopMembershipSummary } from "@/features/shop/types/shop";

/*
 * Đọc `shopMemberships` từ hồ sơ người dùng (getCurrentUser gộp /auth/me + GET /shop/session). `RoleGuard`
 * (components/layout/route-guards.tsx) dùng hook này để quyết định vào `/vendor/**` được hay không.
 */
export function useShopMemberships(): { memberships: ShopMembershipSummary[]; isPending: boolean } {
  const { data, isPending } = useCurrentUser();
  return { memberships: data?.shopMemberships ?? [], isPending };
}

/** Gian hàng đầu tiên user đang là thành viên ĐANG HOẠT ĐỘNG (nếu có). */
export function useActiveShopMembership(): ShopMembershipSummary | undefined {
  const { memberships } = useShopMemberships();
  return memberships.find((m) => m.status === "active");
}
