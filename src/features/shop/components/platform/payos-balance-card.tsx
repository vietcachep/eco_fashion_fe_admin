"use client";

import { LandmarkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/api-error";
import { formatVnd } from "@/lib/format";
import { usePayosBalance } from "@/features/shop/hooks/use-admin-payouts";

/*
 * Thẻ "Tài khoản chi PayOS" đầu màn đối soát. Trạng thái cấu hình quyết định cách
 * kế toán làm việc: chưa có khoá lệnh chi ⇒ kỳ để "Chờ chi" và chuyển khoản tay;
 * đã có khoá ⇒ kỳ có thực chi > 0 tự gửi lệnh chi, số dư hiện để biết quỹ chi còn đủ.
 */
export function PayosBalanceCard() {
  const { data, isLoading, error } = usePayosBalance();

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LandmarkIcon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Tài khoản chi PayOS</p>
          {isLoading ? (
            <>
              <Skeleton className="mt-2 h-7 w-40 rounded" />
              <Skeleton className="mt-2 h-3.5 w-full max-w-md rounded" />
            </>
          ) : error ? (
            <p className="mt-1 text-sm text-destructive">{apiErrorMessage(error, "Không tra cứu được tài khoản chi PayOS.")}</p>
          ) : data?.configured ? (
            <>
              <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">{data.balance !== null ? formatVnd(data.balance) : "Không tra cứu được số dư"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kỳ có thực chi &gt; 0 được gửi lệnh chi tự động. Chưa có webhook kết quả — đối chiếu trên bảng điều khiển PayOS rồi bấm
                &quot;Đánh dấu đã chi&quot;.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-heading text-lg font-semibold tracking-tight">Chưa cấu hình</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Chưa có khoá lệnh chi — kỳ đối soát để Chờ chi, kế toán chuyển tay rồi Đánh dấu đã chi.
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
