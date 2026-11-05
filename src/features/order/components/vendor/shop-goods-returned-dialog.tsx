"use client";

import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { useShopGoodsReturned } from "@/features/order/hooks/use-shop-orders";

function GoodsReturnedBody({ code, onClose }: { code: string; onClose: () => void }) {
  const returned = useShopGoodsReturned(code);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Hàng đã về kho — đơn {code}?</DialogTitle>
        <DialogDescription>
          Chỉ xác nhận khi shop <b>đã thực sự nhận lại hàng</b> của đơn giao không thành công: hệ thống sẽ nhập kho lại đúng số lượng đã giao. Thao tác này
          chỉ làm được <b>một lần</b>, trong 30 ngày kể từ lúc báo giao không thành công — quá hạn thì liên hệ CSKH của sàn để chỉnh kho.
        </DialogDescription>
      </DialogHeader>
      {returned.error ? <ApiErrorState error={returned.error} fallback="Xác nhận hàng về kho thất bại." compact /> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Chưa nhận hàng
        </Button>
        <Button disabled={returned.isPending} onClick={() => returned.mutate(undefined, { onSuccess: onClose })}>
          {returned.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Xác nhận nhập kho
        </Button>
      </DialogFooter>
    </>
  );
}

/* "Hàng đã về kho" cho đơn huỷ vì giao thất bại (quyền shop.order.update; hiện theo cờ `canConfirmGoodsReturned` của response). */
export function ShopGoodsReturnedDialog({ code, open, onOpenChange }: { code: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <GoodsReturnedBody code={code} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
