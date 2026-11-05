import { TriangleAlertIcon } from "lucide-react";
import type { DetailRow } from "@/components/shared/detail-list";
import type { OrderResponse } from "@/lib/api/generated/model";
import { formatDateTime } from "@/lib/format";
import { CARRIER_LABEL, DELIVERY_FAILED_REASON_LABEL } from "@/lib/labels";

type ShippingFields = Pick<
  OrderResponse,
  | "carrier"
  | "carrierName"
  | "trackingCode"
  | "trackingUrl"
  | "trackingReused"
  | "deliveryFailedAt"
  | "deliveryFailedReason"
  | "goodsReturnedAt"
  | "canConfirmGoodsReturned"
>;

/*
 * Các dòng "bằng chứng giao hàng" của đơn (PLAN-0031 §2.1–2.4) cho thẻ "Giao hàng" — DÙNG CHUNG cổng shop và cổng sàn: hãng + mã vận đơn
 * (+ cảnh báo mã dùng lại cho đơn khác), link tra cứu, và nếu đơn đã huỷ vì giao không thành công thì lý do + hàng đã về kho chưa.
 * Link chỉ mở khi là https (backend vốn chỉ lưu https hoặc link do hệ thống sinh theo hãng; kiểm lại ở đây vì href là đầu vào người dùng).
 * Đơn đã `shipping` từ trước đợt này không có hãng / mã vận đơn → "—".
 */
export function shippingRows(o: ShippingFields): DetailRow[] {
  const carrierName = o.carrierName || (o.carrier ? (CARRIER_LABEL[o.carrier] ?? o.carrier) : null);
  const rows: DetailRow[] = [
    { label: "Hãng vận chuyển", value: carrierName ?? "—" },
    {
      label: "Mã vận đơn",
      value: o.trackingCode ? (
        <span>
          <code className="font-mono">{o.trackingCode}</code>
          {o.trackingReused ? (
            <span className="mt-0.5 flex items-start gap-1 text-xs font-normal text-amber-700 dark:text-amber-400">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              Mã này đã được gắn cho đơn khác của cùng shop — cần đối chiếu với hãng vận chuyển.
            </span>
          ) : null}
        </span>
      ) : (
        "—"
      ),
    },
    {
      label: "Theo dõi",
      value:
        o.trackingUrl && o.trackingUrl.startsWith("https://") ? (
          <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Mở link vận chuyển
          </a>
        ) : (
          "—"
        ),
    },
  ];

  if (o.deliveryFailedAt) {
    rows.push({
      label: "Giao không thành công",
      value: (
        <span>
          {(o.deliveryFailedReason && DELIVERY_FAILED_REASON_LABEL[o.deliveryFailedReason]) || o.deliveryFailedReason || "—"}
          <span className="block text-xs font-normal text-muted-foreground">{formatDateTime(o.deliveryFailedAt)}</span>
        </span>
      ),
    });
    rows.push({
      label: "Hàng về kho",
      value: o.goodsReturnedAt
        ? `Đã nhập kho lúc ${formatDateTime(o.goodsReturnedAt)}`
        : o.canConfirmGoodsReturned
          ? "Chưa xác nhận — shop bấm \"Hàng đã về kho\" khi nhận lại hàng"
          : "Chưa nhập kho lại",
    });
  }
  return rows;
}
