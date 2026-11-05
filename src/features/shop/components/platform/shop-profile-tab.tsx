"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailList } from "@/components/shared/detail-list";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { AdminShopResponse } from "@/lib/api/generated/model";
import { formatCommissionRate } from "@/features/shop/components/platform/shop-cells";
import { ShopBankCard } from "@/features/shop/components/platform/shop-bank-card";
import { ShopRegistrationCard } from "@/features/shop/components/platform/shop-registration-card";

/*
 * Tab "Hồ sơ" ở chi tiết shop: thông tin gian hàng + TÀI KHOẢN NGÂN HÀNG với số tài khoản ĐẦY ĐỦ
 * (`GET /admin/shops/:id` chỉ trả `bankAccountNumber` cho nhân viên sàn; vendor chỉ thấy bản che).
 * Đây là tài khoản nhận tiền khi sàn chi kỳ đối soát — kế toán đối chiếu trước khi chuyển. Phần ngân hàng
 * (trạng thái xác minh, so tên chủ shop ↔ chủ TK, nút "Xác minh tài khoản") nằm ở `ShopBankCard`.
 */
export function ShopProfileTab({ shop }: { shop: AdminShopResponse }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ShopRegistrationCard shopId={shop.id} />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Thông tin gian hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {shop.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh động Cloudinary
            <img src={shop.bannerUrl} alt="" className="h-32 w-full rounded-lg border object-cover" />
          ) : null}
          <DetailList
            rows={[
              { label: "Mã gian hàng", value: <span className="font-mono">{shop.code}</span> },
              { label: "Slug", value: shop.slug },
              {
                label: "Chủ gian hàng",
                value: shop.ownerName ? (
                  <>
                    {shop.ownerName}
                    {shop.ownerEmail ? <span className="block text-xs font-normal text-muted-foreground">{shop.ownerEmail}</span> : null}
                  </>
                ) : (
                  <span className="font-mono text-xs font-normal text-muted-foreground">{shop.ownerUserId}</span>
                ),
              },
              { label: "Hoa hồng", value: formatCommissionRate(shop.commissionRate) },
              { label: "Số sản phẩm", value: formatNumber(shop.totalProducts) },
              { label: "Đánh giá TB", value: shop.ratingAvg ? Number(shop.ratingAvg).toFixed(1) : "Chưa có" },
              { label: "Mô tả", value: shop.description || "—" },
              { label: "Tạo lúc", value: formatDateTime(shop.createdAt) },
              { label: "Cập nhật", value: formatDateTime(shop.updatedAt) },
            ]}
          />
        </CardContent>
      </Card>

      <ShopBankCard shop={shop} />
    </div>
  );
}
