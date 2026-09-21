"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminSystemControllerBannerDelete,
  adminSystemControllerBroadcast,
  adminSystemControllerFaqCreate,
  adminSystemControllerFaqDelete,
  adminSystemControllerFaqUpdate,
  adminSystemControllerPageSave,
  adminSystemControllerProvinceUpdate,
  adminSystemControllerReplyContact,
  adminSystemControllerSettingUpdate,
  useAdminSystemControllerBannersAdmin,
  useAdminSystemControllerContacts,
  useAdminSystemControllerFaqsAdmin,
  useAdminSystemControllerPagesAdmin,
  useAdminSystemControllerProvincesAdmin,
  useAdminSystemControllerSettingsList,
} from "@/lib/api/generated/admin-system/admin-system";
import type {
  BroadcastNotificationRequest,
  SaveFaqRequest,
  SavePageRequest,
  UpdateProvinceRequest,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import { createBanner, updateBanner, type BannerFormValues } from "@/features/system/api/banner-api";
import type {
  BannerResponse,
  ContactResponse,
  FaqResponse,
  PageResponseDto,
  ProvinceResponse,
  SettingRow,
} from "@/features/system/types/system";

/*
 * Module system: tham số vận hành, tỉnh/phí ship, banner, thông báo, liên hệ,
 * FAQ, trang tĩnh. Mỗi nhóm một cặp query + mutation; mutation invalidate cả
 * bản admin lẫn bản công khai (web bán hàng đọc /settings/public, /provinces…).
 */
const P = "/api/v1/admin";

function useSystemMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, paths: string[], success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, ...paths);
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}

// ---- Tham số vận hành
export function useSettings() {
  return useAdminSystemControllerSettingsList({ query: { select: (r) => r as unknown as SettingRow[], staleTime: 60_000 } });
}
export function useUpdateSetting() {
  return useSystemMutation(
    ({ key, value }: { key: string; value: unknown }) => adminSystemControllerSettingUpdate(key, { value: value as never }),
    [`${P}/settings`, "/api/v1/settings/public"],
    "Đã cập nhật tham số.",
    "Cập nhật tham số thất bại — sai kiểu giá trị?",
  );
}

// ---- Tỉnh / thành + phí ship
export function useProvinces() {
  return useAdminSystemControllerProvincesAdmin({ query: { select: (r) => r as unknown as ProvinceResponse[], staleTime: 60_000 } });
}
export function useUpdateProvince() {
  return useSystemMutation(
    ({ code, body }: { code: string; body: UpdateProvinceRequest }) => adminSystemControllerProvinceUpdate(code, body),
    [`${P}/provinces`, "/api/v1/provinces"],
    "Đã cập nhật phí ship.",
    "Cập nhật thất bại.",
  );
}

// ---- Banner
const BANNER_PATHS = [`${P}/banners`, "/api/v1/banners"];
export function useBanners() {
  return useAdminSystemControllerBannersAdmin({ query: { select: (r) => r as unknown as BannerResponse[], staleTime: 30_000 } });
}
export function useCreateBanner() {
  return useSystemMutation(
    ({ values, file }: { values: BannerFormValues; file: File }) => createBanner(values, file),
    BANNER_PATHS,
    "Đã tạo banner.",
    "Tạo banner thất bại.",
  );
}
export function useUpdateBanner() {
  return useSystemMutation(
    ({ id, values, file }: { id: string; values: Partial<BannerFormValues>; file?: File | null }) => updateBanner(id, values, file),
    BANNER_PATHS,
    "Đã cập nhật banner.",
    "Cập nhật banner thất bại.",
  );
}
export function useDeleteBanner() {
  return useSystemMutation((id: string) => adminSystemControllerBannerDelete(id), BANNER_PATHS, "Đã xoá banner.", "Xoá banner thất bại.");
}

// ---- Thông báo
export function useBroadcast() {
  return useMutation({
    mutationFn: async (body: BroadcastNotificationRequest) =>
      (await adminSystemControllerBroadcast(body)) as unknown as { sent: number },
    onSuccess: (r) => toast.success(`Đã gửi thông báo tới ${r?.sent ?? 0} người.`),
    onError: (e) => toast.error(apiErrorMessage(e, "Gửi thông báo thất bại.")),
  });
}

// ---- Liên hệ
export function useContacts(params: { status?: string; page: number; size: number }) {
  return useAdminSystemControllerContacts(
    { status: (params.status || undefined) as never, page: params.page, size: params.size },
    { query: { select: (r) => asPage<ContactResponse>(r), placeholderData: keepPreviousData, staleTime: 15_000 } },
  );
}
export function useReplyContact() {
  return useSystemMutation(
    ({ id, reply }: { id: string; reply: string }) => adminSystemControllerReplyContact(id, { reply }),
    [`${P}/contacts`, `${P}/reports`],
    "Đã gửi phản hồi qua email.",
    "Gửi phản hồi thất bại.",
  );
}

// ---- FAQ
const FAQ_PATHS = [`${P}/faqs`, "/api/v1/faqs"];
export function useFaqs() {
  return useAdminSystemControllerFaqsAdmin({ query: { select: (r) => r as unknown as FaqResponse[], staleTime: 60_000 } });
}
export function useSaveFaq() {
  return useSystemMutation(
    ({ id, body }: { id?: string; body: SaveFaqRequest }) => (id ? adminSystemControllerFaqUpdate(id, body) : adminSystemControllerFaqCreate(body)),
    FAQ_PATHS,
    "Đã lưu câu hỏi.",
    "Lưu thất bại.",
  );
}
export function useDeleteFaq() {
  return useSystemMutation((id: string) => adminSystemControllerFaqDelete(id), FAQ_PATHS, "Đã xoá câu hỏi.", "Xoá thất bại.");
}

// ---- Trang tĩnh
export function useStaticPages() {
  return useAdminSystemControllerPagesAdmin({ query: { select: (r) => r as unknown as PageResponseDto[], staleTime: 60_000 } });
}
export function useSavePage() {
  return useSystemMutation(
    ({ slug, body }: { slug: string; body: SavePageRequest }) => adminSystemControllerPageSave(slug, body),
    [`${P}/pages`, "/api/v1/pages"],
    "Đã lưu trang.",
    "Lưu trang thất bại.",
  );
}
