"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { usePayoutAutoSettings, useSetPayoutAuto } from "@/features/shop/hooks/use-payout-auto-settings";

const LOAD_ERROR = "Không tải được cấu hình chi trả tự động.";

/*
 * Công tắc chi trả TỰ ĐỘNG từng shop. Bật (mặc định) = cron 02:00 hằng ngày tự gom đơn và chi PayOS cho shop; tắt = cron bỏ qua shop đó
 * (đơn không mất, vẫn được gom khi chạy tay). "Chạy kỳ đối soát" luôn chi được cả shop đang tắt. Đổi công tắc cần `supplier.payout.process`.
 */
export function PayoutAutoPanel() {
  const { data, isLoading, isError, error } = usePayoutAutoSettings();
  const set = useSetPayoutAuto();
  const canEdit = usePermission(PERMISSIONS.supplierPayoutProcess);
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((r) => !term || r.shopName.toLowerCase().includes(term) || r.shopCode.toLowerCase().includes(term));
  }, [data, q]);
  const off = (data ?? []).filter((r) => !r.autoEnabled).length;

  if (isError) return <ApiErrorState error={error} fallback={LOAD_ERROR} compact />;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Cron 02:00 chỉ tự chi cho shop đang <b>bật</b>. Shop tắt vẫn chi được khi bạn bấm “Chạy kỳ đối soát”.{" "}
            {data ? `Đang tắt: ${formatNumber(off)}/${formatNumber(data.length)} shop.` : null}
          </p>
          <Input className="w-full sm:w-64" placeholder="Tìm shop…" aria-label="Tìm shop" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Không có shop phù hợp.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.shopId} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium">{r.shopName}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.shopCode}
                    {r.updatedAt ? ` · đổi lúc ${formatDateTime(r.updatedAt)}` : ""}
                  </span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className={r.autoEnabled ? "text-foreground" : "text-muted-foreground"}>{r.autoEnabled ? "Tự động" : "Chạy tay"}</span>
                  <Switch
                    checked={r.autoEnabled}
                    disabled={!canEdit || (set.isPending && set.variables?.shopId === r.shopId)}
                    aria-label={`Chi trả tự động cho ${r.shopName}`}
                    onCheckedChange={(v) => set.mutate({ shopId: r.shopId, enabled: v })}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
