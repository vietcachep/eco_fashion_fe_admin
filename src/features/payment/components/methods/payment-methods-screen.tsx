"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { usePaymentMethods, useSetMethodActive } from "@/features/payment/hooks/use-payments";

const LOAD_ERROR = "Không tải được phương thức thanh toán.";

/* Bật / tắt phương thức thanh toán hiện ở bước đặt hàng (COD · PayOS; dòng cũ vnpay / chuyển khoản nếu còn trong DB chỉ để xem). */
export function PaymentMethodsScreen() {
  const { data, isPending, error } = usePaymentMethods();
  const setActive = useSetMethodActive();
  const canManage = usePermission(PERMISSIONS.methodManage);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <Card className="py-0">
      <CardContent className="divide-y p-0">
        {(data ?? []).map((m) => (
          <div key={m.code} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {m.name} <code className="ml-1 font-mono text-xs text-muted-foreground">{m.code}</code>
              </p>
              <p className="text-sm text-muted-foreground">{m.description ?? m.kind}</p>
            </div>
            <StatusBadge tone={m.isActive ? "success" : "neutral"}>{m.isActive ? "Đang bật" : "Đang tắt"}</StatusBadge>
            <Switch
              checked={m.isActive}
              disabled={!canManage || setActive.isPending}
              onCheckedChange={(v) => setActive.mutate({ code: m.code, isActive: v })}
              aria-label={`Bật/tắt ${m.name}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
