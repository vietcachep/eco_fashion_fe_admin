"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { variantText, type ShopOrderDetail } from "@/features/order/types/shop-order";

const subscribe = () => () => {};

/*
 * Phiếu đóng gói chỉ hiện khi in (window.print). Vì sao dùng portal vào <body>:
 * sidebar/header nằm ngoài component này nên CSS in phải ẩn MỌI con trực tiếp của
 * body trừ phiếu — nếu phiếu nằm lồng trong trang thì không ẩn được phần còn lại
 * mà không đụng layout/globals.css. `display:none` (không phải visibility) để
 * không sinh trang trắng. Không thêm thư viện in.
 *
 * Phiếu cho người đóng gói + shipper: không có giá/giảm giá (khách không cần
 * thấy trên bao hàng), chỉ tiền cần THU HỘ nếu là COD chưa thu.
 */
const PRINT_CSS = `
@media print {
  body > *:not(#shop-order-slip) { display: none !important; }
  #shop-order-slip { display: block !important; }
  @page { margin: 12mm; }
}`;

export function ShopOrderPrintSlip({ order: o }: { order: ShopOrderDetail }) {
  // Portal cần `document` — useSyncExternalStore phân biệt SSR/hydrate/client mà không setState trong effect.
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return null;

  const collectCod = o.paymentMethodCode === "cod" && o.paymentStatus !== "paid";

  return createPortal(
    <div id="shop-order-slip" className="hidden bg-white p-4 text-[13px] leading-relaxed text-black">
      <style>{PRINT_CSS}</style>
      <div className="flex items-start justify-between border-b border-black pb-2">
        <div>
          <p className="text-lg font-bold">PHIẾU ĐÓNG GÓI</p>
          <p>{o.shopName}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold">{o.code}</p>
          <p>Đặt lúc {formatDateTime(o.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-black py-2">
        <div>
          <p className="font-bold">Người nhận</p>
          <p>{o.recipientName}</p>
          <p>{o.recipientPhone}</p>
          <p>{o.shippingAddress}</p>
        </div>
        <div>
          <p className="font-bold">Thanh toán</p>
          <p>{PAYMENT_METHOD_LABEL[o.paymentMethodCode] ?? o.paymentMethodCode}</p>
          {collectCod ? (
            <p className="text-base font-bold">THU HỘ (COD): {o.total.display}</p>
          ) : (
            <p className="font-semibold">Đã thanh toán — không thu tiền</p>
          )}
          {o.customerNote ? (
            <p className="pt-1">
              <b>Ghi chú của khách:</b> {o.customerNote}
            </p>
          ) : null}
        </div>
      </div>

      <table className="mt-2 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black">
            <th className="w-8 py-1">#</th>
            <th className="py-1">Sản phẩm</th>
            <th className="py-1">SKU</th>
            <th className="w-12 py-1 text-right">SL</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((it, i) => (
            <tr key={it.id} className="border-b border-neutral-400 align-top">
              <td className="py-1">{i + 1}</td>
              <td className="py-1">
                {it.name}
                {variantText(it) ? <span className="block text-xs">{variantText(it)}</span> : null}
              </td>
              <td className="py-1 font-mono text-xs">{it.sku}</td>
              <td className="py-1 text-right font-bold">{formatNumber(it.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-2 text-xs">
        Tổng {formatNumber(o.items.reduce((sum, it) => sum + it.quantity, 0))} sản phẩm · Kiểm hàng đủ SKU / số lượng trước khi dán kín.
      </p>
    </div>,
    document.body,
  );
}
