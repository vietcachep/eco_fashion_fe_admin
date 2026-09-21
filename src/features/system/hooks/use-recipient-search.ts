"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useAdminUserControllerList } from "@/lib/api/generated/admin-users/admin-users";
import type { UserProfileResponse } from "@/lib/api/generated/model";
import { asPage } from "@/types/common";

/*
 * Tìm người nhận cho màn gửi thông báo — bọc GET /admin/users (tag admin-users)
 * ngay trong feature system thay vì import hook của feature identity (feature
 * không import internals của nhau). Chỉ khách hàng, 10 kết quả đầu.
 */
export function useRecipientSearch(keyword: string) {
  return useAdminUserControllerList(
    { q: keyword || undefined, roleCode: "customer", status: "active", page: 1, size: 10 },
    { query: { select: (r) => asPage<UserProfileResponse>(r), placeholderData: keepPreviousData, staleTime: 30_000 } },
  );
}
