import Link from "next/link";
import { StoreIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/lib/constants";
import { SHOP_STATUS, statusMeta } from "@/lib/labels";

/*
 * Các ô hiển thị dùng lại ở nhiều bảng phía sàn (danh sách shop, đối soát):
 * logo + tên shop, nhãn trạng thái, hoa hồng. Gom một chỗ để
 * cùng một dữ liệu luôn trông giống nhau (Rule 0 — "bảng/badge trùng là bug").
 */

/* Logo + tên + mã shop; tên là link sang chi tiết. `tab` mở thẳng tab tương ứng (vd "payouts"). */
export function ShopIdentity({
  id,
  name,
  code,
  logoUrl,
  tab,
}: {
  id: string;
  name: string | null;
  code?: string;
  logoUrl?: string | null;
  tab?: "profile" | "payouts";
}) {
  const href = tab ? `${ROUTES.shop.shops}/${id}?tab=${tab}` : `${ROUTES.shop.shops}/${id}`;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh động Cloudinary
          <img src={logoUrl} alt="" className="size-full object-cover" />
        ) : (
          <StoreIcon className="size-4 text-muted-foreground/60" />
        )}
      </div>
      <div className="min-w-0 leading-tight">
        <Link href={href} className="block truncate font-semibold hover:underline">
          {name ?? "Gian hàng đã xoá"}
        </Link>
        {code ? <p className="font-mono text-xs text-muted-foreground">{code}</p> : null}
      </div>
    </div>
  );
}

export function ShopStatusBadge({ status }: { status: string }) {
  const meta = statusMeta(SHOP_STATUS, status);
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}

/* Backend trả hoa hồng dạng chuỗi ("10", "8.50") — bỏ số 0 thừa, tối đa 2 chữ số thập phân. */
export function formatCommissionRate(rate: string | null | undefined): string {
  const n = Number(rate);
  if (rate === null || rate === undefined || rate === "" || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
}

