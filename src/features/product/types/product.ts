import type { ProductCardResponse } from "@/lib/api/generated/model";

/*
 * Dòng danh sách sản phẩm khu quản trị (GET /admin/products): backend trả
 * thẻ sản phẩm rút gọn + `status` (không có biến thể / tồn chi tiết — xem ở
 * màn chi tiết). Swagger chỉ khai PageResponse trần nên khai ở đây.
 */
export type ProductListItem = ProductCardResponse & { status: string };
