import type {
  ProductCardResponse,
  ProductVariantResponse,
  ShopTemplateAttributeResponse,
} from "@/lib/api/generated/model";

/*
 * Màn sản phẩm dùng CHUNG một bộ component cho hai cổng, khác nhau ở nguồn
 * dữ liệu (xem hooks/use-products.ts):
 * - "platform": nhân viên sàn, /admin/products* (quyền product.product.*)
 * - "vendor":   chủ/nhân viên shop, /shop/products* (quyền shop.product.*), chỉ
 *   thấy & sửa hàng của chính shop mình.
 */
export type ProductScope = "platform" | "vendor";

/*
 * Dòng danh sách sản phẩm (GET /admin/products và /shop/products): backend trả
 * thẻ sản phẩm rút gọn + `status` (không có biến thể / tổng tồn — xem ở màn chi
 * tiết). Swagger chỉ khai PageResponse trần nên khai ở đây.
 */
export type ProductListItem = ProductCardResponse & { status: string };

/*
 * Kiểu thuộc tính của ngành hàng (PLAN-0016): legacy_fashion = form thời trang
 * cũ (giới tính / chất liệu / bảo quản + biến thể màu × size); dynamic = dựng
 * theo MẪU thuộc tính của ngành (điện tử, gia dụng, mỹ phẩm…).
 */
export type AttributeMode = "legacy_fashion" | "dynamic";

/* Một ngành LÁ có thể gán sản phẩm — chung cho hai nguồn (admin dựng từ cây, vendor lấy từ /leaves). */
export interface ProductCategoryOption {
  id: string;
  slug: string;
  name: string;
  /** Đường dẫn từ ngành gốc ("Điện thoại & Phụ kiện › Điện thoại") để phân biệt ngành lá trùng tên. */
  path: string;
  attributeMode: AttributeMode;
}

/*
 * Mẫu thuộc tính của ngành đã tách sẵn: `fields` là thuộc tính cấp sản phẩm
 * (hiện ở form thông tin), `axes` là TRỤ BIẾN THỂ (hiện ở ma trận biến thể,
 * tối đa 2). Ngành legacy_fashion luôn rỗng cả hai.
 */
export interface ProductTemplate {
  fields: ShopTemplateAttributeResponse[];
  axes: ShopTemplateAttributeResponse[];
}

/* Response chi tiết kèm cờ `isActive` mà backend CHƯA trả (xem product-variants-editor) — đọc phòng hờ, thiếu = bật. */
export type ProductVariantWithActive = ProductVariantResponse & { isActive?: boolean };
