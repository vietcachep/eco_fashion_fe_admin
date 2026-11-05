"use client";

import { useState } from "react";
import { CircleCheckIcon, ClockIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailList } from "@/components/shared/detail-list";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminShopResponse } from "@/lib/api/generated/model";
import { ShopBankStatusBadge } from "@/features/shop/components/platform/shop-cells";
import { useVerifyShopBank } from "@/features/shop/hooks/use-admin-shops";
import { normalizeBankAccountName } from "@/features/shop/schemas/shop-bank-schema";
import { bankNameByBin } from "@/features/shop/types/bank-list";

/*
 * Thẻ "Tài khoản ngân hàng" ở tab Hồ sơ của chi tiết shop (sàn xem): số TK ĐẦY ĐỦ, trạng thái xác minh, số giờ giữ chi trả sau đổi TK
 * và phần SO SÁNH họ tên chủ shop ↔ tên chủ tài khoản. Backend đã tự so (bỏ dấu, IN HOA, gộp khoảng trắng): lệch → `pending_verification`,
 * kỳ chi trả của shop `held` tới khi quản lý (supplier.shop.approve) bấm "Xác minh tài khoản". Phép so ở FE dùng đúng cách chuẩn hoá đó
 * chỉ để quản lý NHÌN thấy lý do — quyết định thật vẫn ở backend.
 */
type NameCheck = "match" | "mismatch" | "unknown";

function compareNames(ownerName?: string | null, accountName?: string | null): NameCheck {
  const owner = normalizeBankAccountName(ownerName ?? "").trim();
  const account = normalizeBankAccountName(accountName ?? "").trim();
  if (!owner || !account) return "unknown";
  return owner === account ? "match" : "mismatch";
}

export function ShopBankCard({ shop }: { shop: AdminShopResponse }) {
  const verify = useVerifyShopBank();
  const [confirming, setConfirming] = useState(false);
  const hasBank = !!(shop.bankCode || shop.bankAccountName || shop.bankAccountNumber);
  const awaitingVerification = hasBank && shop.bankStatus === "pending_verification";
  const bankName = shop.bankCode ? `${bankNameByBin(shop.bankCode) ?? "Ngân hàng khác"} (BIN ${shop.bankCode})` : "—";
  const fullNumber = shop.bankAccountNumber ?? null;

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="text-base">Tài khoản ngân hàng</CardTitle>
        <CardDescription>Tài khoản nhận tiền khi sàn chi kỳ đối soát. Chỉ nhân viên sàn thấy đầy đủ số tài khoản.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasBank ? (
          <>
            <DetailList
              rows={[
                { label: "Ngân hàng", value: bankName },
                { label: "Chủ tài khoản", value: shop.bankAccountName ?? "—" },
                { label: "Số tài khoản", value: <span className="font-mono tracking-wide">{fullNumber ?? shop.bankAccountNumberMasked ?? "—"}</span> },
                { label: "Xác minh", value: <ShopBankStatusBadge status={shop.bankStatus} /> },
                {
                  label: "Xác minh tay lúc",
                  value: shop.bankVerifiedAt ? formatDateTime(shop.bankVerifiedAt) : <span className="font-normal text-muted-foreground">Chưa (không cần nếu tên khớp)</span>,
                },
                { label: "Giữ chi trả sau đổi TK", value: `${shop.bankChangeHoldHours} giờ` },
              ]}
            />
            <NameComparison ownerName={shop.ownerName} accountName={shop.bankAccountName} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Shop chưa khai báo tài khoản ngân hàng — kỳ đối soát có tiền phải chi sẽ không chi tự động được cho tới khi shop bổ sung.
          </p>
        )}

        {awaitingVerification ? (
          <div role="status" className="flex flex-col gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Tài khoản đang chờ sàn xác minh vì tên chủ tài khoản khác họ tên chủ shop. Kỳ chi trả của shop đang bị giữ tới khi được xác minh; sau đó giữ thêm{" "}
                {shop.bankChangeHoldHours} giờ.
              </span>
            </p>
            <PermissionGate permission={PERMISSIONS.supplierShopApprove}>
              <div>
                <Button size="sm" disabled={verify.isPending} onClick={() => setConfirming(true)}>
                  {verify.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CircleCheckIcon className="size-4" />}
                  Xác minh tài khoản
                </Button>
              </div>
            </PermissionGate>
          </div>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Xác minh tài khoản ngân hàng của ${shop.name}?`}
        description={`${bankName} — số ${fullNumber ?? shop.bankAccountNumberMasked ?? "—"}, chủ tài khoản ${shop.bankAccountName ?? "—"} (chủ shop: ${shop.ownerName ?? "không rõ"}). Chỉ xác minh khi đã đối chiếu và chắc chắn tài khoản thuộc chủ shop. Sau khi xác minh, chi trả được mở sau ${shop.bankChangeHoldHours} giờ giữ.`}
        confirmLabel="Xác minh"
        onConfirm={() => verify.mutate({ id: shop.id, bankAccountNumber: fullNumber ?? undefined })}
      />
    </Card>
  );
}

/* So sánh trực quan hai tên đặt cạnh nhau (xếp dọc cho vừa cột hẹp) — kèm kết luận khớp / lệch. */
function NameComparison({ ownerName, accountName }: { ownerName?: string | null; accountName?: string | null }) {
  const check = compareNames(ownerName, accountName);
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 text-sm",
        check === "match" && "border-emerald-300/60 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30",
        check === "mismatch" && "border-amber-300/60 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30",
      )}
    >
      <div>
        <p className="text-xs text-muted-foreground">Họ tên chủ gian hàng</p>
        <p className="font-semibold break-words">{ownerName || "—"}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Tên chủ tài khoản ngân hàng</p>
        <p className="font-semibold break-words">{accountName || "—"}</p>
      </div>
      {check === "match" ? (
        <p className="flex items-start gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0" />
          Hai tên khớp nhau (sau khi bỏ dấu, viết hoa, gộp khoảng trắng).
        </p>
      ) : null}
      {check === "mismatch" ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          Hai tên lệch nhau — đối chiếu giấy tờ của chủ shop trước khi xác minh tài khoản.
        </p>
      ) : null}
      {check === "unknown" ? <p className="text-xs text-muted-foreground">Thiếu họ tên chủ shop hoặc tên chủ tài khoản nên chưa so được.</p> : null}
    </div>
  );
}
