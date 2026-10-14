import { isAxiosError } from "axios";
import type { StockRowResponse } from "@/lib/api/generated/model";
import { apiErrorCode, apiMessage } from "@/lib/api-error";
import { PERMISSIONS, ROUTES } from "@/lib/constants";
import type { PermissionCode } from "@/lib/permission-codes.generated";

/*
 * Kho có HAI cổng dùng chung một bộ component:
 *  - "platform": nhân viên sàn, `/admin/inventory/**` — thấy kho của MỌI shop.
 *  - "vendor":   chủ/nhân viên shop, `/shop/inventory/**` — chỉ kho của shop mình
 *    (shopId backend suy từ JWT/ngữ cảnh shop nên KHÔNG có tham số shop nào ở FE).
 * Hai cổng cùng DTO (StockRowResponse, StockReceiptResponse…); chỉ khác endpoint,
 * mã quyền và route nên component nhận `scope` rồi tra cấu hình dưới đây thay vì
 * nhân bản.
 */
export type InventoryScope = "platform" | "vendor";

export interface InventoryScopeConfig {
  routes: {
    stock: string;
    receipts: string;
    receiptNew: string;
    /** Trang chi tiết sản phẩm (nối thêm `/${productId}`). */
    products: string;
  };
  permissions: {
    read: PermissionCode;
    /** Lập phiếu nhập + ghi sổ phiếu. */
    receive: PermissionCode;
    adjust: PermissionCode;
    /** Mã quyền xem sản phẩm — không có thì tên sản phẩm chỉ là chữ, không phải link. */
    productRead: PermissionCode;
  };
  /** Tên cột/nhãn biến thể — ngành đa dạng nên vendor gọi là "Phân loại". */
  variantHeader: string;
}

export const INVENTORY_SCOPES: Record<InventoryScope, InventoryScopeConfig> = {
  platform: {
    routes: {
      stock: ROUTES.product.stock,
      receipts: ROUTES.product.receipts,
      receiptNew: ROUTES.product.receiptNew,
      products: ROUTES.product.products,
    },
    permissions: {
      read: PERMISSIONS.inventoryRead,
      receive: PERMISSIONS.inventoryReceive,
      adjust: PERMISSIONS.inventoryAdjust,
      productRead: PERMISSIONS.productRead,
    },
    variantHeader: "Biến thể",
  },
  vendor: {
    routes: {
      stock: ROUTES.vendor.inventory,
      receipts: ROUTES.vendor.inventoryReceipts,
      receiptNew: ROUTES.vendor.inventoryReceiptNew,
      products: ROUTES.vendor.products,
    },
    permissions: {
      read: PERMISSIONS.shopInventoryRead,
      receive: PERMISSIONS.shopInventoryManage,
      adjust: PERMISSIONS.shopInventoryManage,
      productRead: PERMISSIONS.shopProductRead,
    },
    variantHeader: "Phân loại",
  },
};

/*
 * Nhãn biến thể gộp "Đen / 128GB". Backend đã ghép sẵn theo ngành: `color` = giá
 * trị trục màu (hoặc trục đầu), `size` = các trục còn lại nối " / "; ngành một
 * trục thì `size` rỗng, biến thể không có thuộc tính thì cả hai rỗng → trả "".
 * Không bao giờ in "null / null" hay dấu "/" thừa.
 */
export function variantLabel(v: { color?: string | null; size?: string | null }): string {
  return [v.color, v.size]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" / ");
}

/* Tên đầy đủ để chọn/nhận diện biến thể trong phiếu: "Tên SP · Đen / 128GB (SKU)". */
export function variantFullName(r: Pick<StockRowResponse, "productName" | "color" | "size" | "sku">): string {
  const name = [r.productName, variantLabel(r)].filter(Boolean).join(" · ");
  return `${name} (${r.sku})`;
}

/* Mã lỗi nghiệp vụ kho (product/foundation/product.constants.ts). */
const ERR_STOCK_LIMIT = "PRODUCT_STOCK_LIMIT_EXCEEDED";
const ERR_RECEIPT_TOO_LARGE = "PRODUCT_RECEIPT_TOTAL_TOO_LARGE";
const ERR_INSUFFICIENT = "PRODUCT_INSUFFICIENT_STOCK";

/* `error.details` của envelope lỗi — với 409 thiếu hàng là { [variantId]: "cần 5, còn 2" }. */
function errorDetails(err: unknown): string[] {
  if (!isAxiosError(err)) return [];
  const details = (err.response?.data as { error?: { details?: Record<string, unknown> } } | undefined)?.error?.details;
  return Object.values(details ?? {}).filter((v): v is string => typeof v === "string");
}

/*
 * Câu báo lỗi cho thao tác kho. Backend đã gửi `message` tiếng Việt cho từng mã; hàm này
 * chỉ (1) có câu dự phòng rõ nghĩa khi message thiếu và (2) kèm "cần/còn" của lỗi thiếu
 * tồn (PRODUCT_INSUFFICIENT_STOCK, 409) để người dùng biết biến thể nào thiếu bao nhiêu.
 */
export function inventoryErrorMessage(err: unknown, fallback: string): string {
  const base = apiMessage(err);
  switch (apiErrorCode(err)) {
    case ERR_STOCK_LIMIT:
      return base ?? "Tồn kho vượt giới hạn 1.000.000.000 đơn vị.";
    case ERR_RECEIPT_TOO_LARGE:
      return base ?? "Tổng giá trị phiếu nhập vượt giới hạn cho phép — tách thành nhiều phiếu.";
    case ERR_INSUFFICIENT: {
      const lines = errorDetails(err);
      const head = base ?? "Không đủ tồn kho để hoàn tất thao tác.";
      return lines.length > 0 ? `${head} (${lines.join("; ")})` : head;
    }
    default:
      return base ?? fallback;
  }
}
