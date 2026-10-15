import type { ShopResponse } from "@/lib/api/generated/model";

/* Phần của gian hàng mà hộp thoại thao tác (duyệt / khoá / hoa hồng) cần — `ShopResponse` và `AdminShopResponse` đều khớp. */
export type ShopActionTarget = Pick<ShopResponse, "id" | "name" | "status" | "commissionRate">;
