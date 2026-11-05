import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard, RoleGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { TopupReturnScreen } from "@/features/shop/components/vendor/topup-return-screen";

export const metadata: Metadata = { title: "Kết quả nạp tiền vào ví", robots: { index: false } };

const mot = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/*
 * PayOS đưa chủ shop quay về đây kèm `?code=&id=&cancel=&status=&orderCode=` (cả khi đã trả lẫn khi huỷ). Chỉ lấy đúng hai thứ màn cần;
 * `orderCode` là mã PayOS của khoản nạp. Thiếu hoặc sai tham số vẫn ra trang, không crash. Searchparams là Promise ở Next 16 nên phải await.
 */
export default async function VendorWalletPayosReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const orderCode = mot(sp.orderCode)?.trim().slice(0, 32) || null;
  const daHuy = mot(sp.cancel) === "true" || mot(sp.status)?.toUpperCase() === "CANCELLED";
  return (
    <RoleGuard>
      <PermissionGuard permission={PERMISSIONS.shopWalletRead}>
        <div className="flex flex-col gap-4">
          <PageHeader title="Nạp tiền vào ví" description="Kết quả thanh toán khoản nạp vào ví đặt cọc COD" />
          <TopupReturnScreen orderCode={orderCode} daHuy={daHuy} />
        </div>
      </PermissionGuard>
    </RoleGuard>
  );
}
