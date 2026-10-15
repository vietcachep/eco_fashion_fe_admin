"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DetailList } from "@/components/shared/detail-list";
import { formatDateTime } from "@/lib/format";
import { ShopStatusBadge } from "@/features/shop/components/platform/shop-cells";
import { useAdminShopRegistration } from "@/features/shop/hooks/use-admin-shop-registration";

/*
 * Thẻ "Hồ sơ đăng ký" ở tab Hồ sơ của chi tiết shop: người bán tự đăng ký (PLAN-0019) khai gì, ai nộp, khi nào, quyết định ra sao.
 * Shop không có hồ sơ (seed / sàn tạo) ⇒ không render gì. Là panel con nên lỗi tải hiện dạng gọn (`compact`) — không đổi cả màn sang 403.
 * Với hồ sơ ĐANG CHỜ, nhắc rõ hệ quả của "Duyệt": người nộp trở thành chủ gian hàng.
 */
export function ShopRegistrationCard({ shopId }: { shopId: string }) {
  const { data: registration, isPending, error } = useAdminShopRegistration(shopId);

  if (error) return <ApiErrorState error={error} fallback="Không tải được hồ sơ đăng ký." compact />;
  if (isPending) return <Skeleton className="h-48 w-full rounded-xl lg:col-span-3" />;
  if (!registration) return null;

  const applicant = registration.applicant;
  const pending = registration.status === "pending";

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Hồ sơ đăng ký bán hàng
          <ShopStatusBadge status={registration.status} />
        </CardTitle>
        <CardDescription>
          {pending
            ? "Duyệt hồ sơ này sẽ biến người đăng ký thành chủ gian hàng — họ đăng nhập trang quản lý bằng chính tài khoản đã đăng ký."
            : "Thông tin người bán khai khi tự đăng ký gian hàng."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DetailList
          rows={[
            {
              label: "Người đăng ký",
              value: applicant ? (
                <>
                  {applicant.fullName}
                  <span className="block text-xs font-normal text-muted-foreground">{applicant.email}</span>
                </>
              ) : (
                <span className="font-normal text-muted-foreground">Tài khoản không còn tồn tại</span>
              ),
            },
            { label: "Người đại diện", value: registration.representativeName },
            { label: "Số điện thoại", value: <span className="font-mono">{registration.phone}</span> },
            { label: "Ngành hàng chính", value: registration.category?.name ?? "—" },
            { label: "Giới thiệu", value: registration.description || "—" },
            { label: "Nộp lúc", value: formatDateTime(registration.submittedAt) },
            { label: "Quyết định lúc", value: formatDateTime(registration.decidedAt) },
            ...(registration.rejectReason ? [{ label: "Lý do từ chối", value: registration.rejectReason }] : []),
          ]}
        />
      </CardContent>
    </Card>
  );
}
