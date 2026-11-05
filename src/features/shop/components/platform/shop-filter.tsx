"use client";

import { NativeSelect } from "@/components/shared/native-select";
import { useShopDirectory } from "@/features/shop/hooks/use-admin-shops";

/*
 * Ô lọc THEO gian hàng cho các hàng đợi xuyên shop của sàn (đổi trả chờ phân xử, hoàn tiền chờ chi): khác `ShopScope` — bắt chọn shop
 * trước mới thấy dữ liệu — ở đây mặc định thấy MỌI shop, lọc shop là tuỳ chọn. Danh sách lấy từ danh bạ gọn (`/admin/shop-directory`, chỉ
 * cần quyền XEM nghiệp vụ như `order.return.read` / `payment.payment.read`), nên CSKH và kế toán đều dùng được dù không có `supplier.shop.read`.
 * Tối đa 100 shop (giới hạn trang của backend).
 */
export function ShopFilter({ value, onChange }: { value: string; onChange: (shopId: string) => void }) {
  const { data, isLoading } = useShopDirectory({ page: 1, size: 100 });
  const shops = data?.content ?? [];
  // Shop đang lọc có thể chưa có trong danh sách (đang tải / vượt 100) — giữ một lựa chọn để ô vẫn đúng giá trị.
  const missing = !!value && !shops.some((s) => s.id === value);

  return (
    <div className="w-full sm:w-64">
      <NativeSelect aria-label="Lọc theo gian hàng" value={value} disabled={isLoading && !value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Tất cả gian hàng</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.code})
          </option>
        ))}
        {missing ? <option value={value}>Gian hàng đang lọc</option> : null}
      </NativeSelect>
    </div>
  );
}
