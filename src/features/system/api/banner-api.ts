import { api } from "@/lib/api";
import type { BannerResponse } from "@/features/system/types/system";

/*
 * Banner đi multipart (ảnh + trường text). Swagger của PATCH /admin/banners/{id}
 * khai body JSON BannerFormRequest (không có `file`) nên Orval sinh FormData
 * thiếu ảnh → viết tay ở đây cho cả tạo lẫn sửa, cùng một hàm dựng FormData.
 * Backend đọc isActive qua ToBoolean ("true"/"false"), sortOrder qua Number.
 */
export interface BannerFormValues {
  title: string;
  subtitle?: string;
  linkUrl?: string;
  position: "hero" | "promo";
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

function toFormData(values: Partial<BannerFormValues>, file?: File | null): FormData {
  const fd = new FormData();
  if (file) fd.append("file", file);
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue;
    fd.append(k, v === null ? "" : String(v));
  }
  return fd;
}

export async function createBanner(values: BannerFormValues, file: File): Promise<BannerResponse> {
  const res = await api.post<{ data: BannerResponse }>("/api/v1/admin/banners", toFormData(values, file));
  return res.data.data;
}

export async function updateBanner(id: string, values: Partial<BannerFormValues>, file?: File | null): Promise<BannerResponse> {
  const res = await api.patch<{ data: BannerResponse }>(`/api/v1/admin/banners/${id}`, toFormData(values, file));
  return res.data.data;
}
