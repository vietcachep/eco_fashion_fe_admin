"use client";

import { PERMISSIONS, ROUTES } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import type { PermissionCode } from "@/lib/permission-codes.generated";
import type { ProductScope } from "@/features/product/types/product";

/*
 * Điểm khác nhau DUY NHẤT giữa hai cổng ở tầng giao diện: đường dẫn + mã quyền.
 * Component sản phẩm đọc từ đây thay vì rẽ nhánh `scope === "vendor"` rải rác,
 * nên thêm/đổi route hay quyền chỉ sửa một chỗ.
 *
 * Vendor chỉ có hai mã: `shop.product.read` (xem) và `shop.product.manage`
 * (mọi thao tác ghi: tạo, sửa, biến thể, ảnh, đăng bán/ẩn, xoá). Cổng sàn chia
 * nhỏ hơn (create / update / publish / delete).
 */
interface ScopeConfig {
  listHref: string;
  newHref: string;
  /** Màn kho cùng cổng — biến thể không sửa tồn ở đây, chỉ trỏ sang. */
  stockHref: string;
  detailHref: (id: string) => string;
  perms: {
    create: PermissionCode;
    update: PermissionCode;
    publish: PermissionCode;
    remove: PermissionCode;
  };
}

const CONFIG: Record<ProductScope, ScopeConfig> = {
  platform: {
    listHref: ROUTES.product.products,
    newHref: ROUTES.product.productNew,
    stockHref: ROUTES.product.stock,
    detailHref: (id) => `${ROUTES.product.products}/${id}`,
    perms: {
      create: PERMISSIONS.productCreate,
      update: PERMISSIONS.productUpdate,
      publish: PERMISSIONS.productPublish,
      remove: PERMISSIONS.productDelete,
    },
  },
  vendor: {
    listHref: ROUTES.vendor.products,
    newHref: ROUTES.vendor.productNew,
    stockHref: ROUTES.vendor.inventory,
    detailHref: (id) => `${ROUTES.vendor.products}/${id}`,
    perms: {
      create: PERMISSIONS.shopProductManage,
      update: PERMISSIONS.shopProductManage,
      publish: PERMISSIONS.shopProductManage,
      remove: PERMISSIONS.shopProductManage,
    },
  },
};

export function useProductScope(scope: ProductScope) {
  const cfg = CONFIG[scope];
  const canCreate = usePermission(cfg.perms.create);
  const canUpdate = usePermission(cfg.perms.update);
  const canPublish = usePermission(cfg.perms.publish);
  const canRemove = usePermission(cfg.perms.remove);

  return {
    scope,
    isVendor: scope === "vendor",
    listHref: cfg.listHref,
    newHref: cfg.newHref,
    stockHref: cfg.stockHref,
    detailHref: cfg.detailHref,
    can: { create: canCreate, update: canUpdate, publish: canPublish, remove: canRemove },
  };
}
