"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  shopMemberControllerAdd,
  shopMemberControllerLeave,
  shopMemberControllerRemove,
  shopMemberControllerUpdate,
  useShopMemberControllerList,
} from "@/lib/api/generated/shops/shops";
import type { AddShopMemberRequest, ShopMemberResponse, UpdateShopMemberRequest } from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";

/* Nhân viên gian hàng CỦA CHÍNH MÌNH (vendor, quyền shop.staff.*) — liệt kê / thêm / đổi vai / gỡ / rời. */
const MEMBERS_PATH = "/api/v1/shop/members";
// Đổi vai/gỡ có thể chính là người đang đăng nhập → quyền shop.* trong phiên đổi theo.
const RELATED = ["/api/v1/shop/session", "/api/v1/auth/me"];

export function useMyShopMembers(params: { page?: number; size?: number } = {}) {
  return useShopMemberControllerList(
    { page: params.page ?? 1, size: params.size ?? 20 },
    {
      query: {
        select: (r) => asPage<ShopMemberResponse>(r),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
      },
    },
  );
}

/*
 * Thêm nhân viên: chủ shop tạo tài khoản + gắn vào shop (POST /shop/members), có hiệu lực ngay. Lỗi KHÔNG toast: dialog đọc `mutation.error` để
 * gắn ngay vào khung (409 IDENTITY_EMAIL_EXISTS ở ô email, 400 IDENTITY_PASSWORD_WEAK ở ô mật khẩu, 409 SHOP_MEMBER_LIMIT_REACHED / 429 ở khung chung).
 * Kết quả có `restored` (tài khoản cũ được khôi phục, mật khẩu không đổi) để màn kết quả nói đúng.
 */
export function useAddShopMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddShopMemberRequest) => shopMemberControllerAdd(body),
    onSuccess: () => {
      invalidateByPath(qc, MEMBERS_PATH);
    },
  });
}

export function useUpdateShopMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string } & UpdateShopMemberRequest) => shopMemberControllerUpdate(v.id, { roleCode: v.roleCode }),
    onSuccess: () => {
      invalidateByPath(qc, MEMBERS_PATH, ...RELATED);
      toast.success("Đã đổi vai nhân viên.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Đổi vai thất bại.")),
  });
}

export function useRemoveShopMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shopMemberControllerRemove(id),
    onSuccess: () => {
      invalidateByPath(qc, MEMBERS_PATH, ...RELATED);
      toast.success("Đã gỡ nhân viên khỏi gian hàng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Gỡ nhân viên thất bại.")),
  });
}

/*
 * Tự rời gian hàng: không cần quyền shop.staff.* (mọi thành viên đang hoạt động đều rời được, kể cả shop chưa duyệt/đã khoá). Chủ cuối cùng bị
 * backend chặn (409 SHOP_LAST_OWNER) — lỗi hiện nguyên văn qua toast. Rời xong quyền vendor của phiên mất ⇒ làm mới session/me để guard đẩy ra khỏi /vendor.
 */
export function useLeaveShop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => shopMemberControllerLeave(),
    onSuccess: () => {
      invalidateByPath(qc, MEMBERS_PATH, ...RELATED);
      toast.success("Bạn đã rời gian hàng.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Rời gian hàng thất bại.")),
  });
}
