import { z } from "zod";
import {
  DELIVERY_FAILED_REASON_CODES,
  SHOP_CANCEL_REASON_CODES,
  TRACKING_CODE_PATTERN,
  carrierNeedsTrackingUrl,
  isCarrierCode,
} from "@/features/order/types/shop-order";

function isHttpsUrl(v: string): boolean {
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

/*
 * Chuyển trạng thái đơn của vendor. Trạng thái đích do dialog biết (không phải ô nhập) nên schema là hàm theo ngữ cảnh:
 * khi chuyển sang `shipping` backend BẮT BUỘC hãng + mã vận đơn (PLAN-0031 §2.1 — thiếu ⇒ 400 ORDER_TRACKING_REQUIRED), các
 * trạng thái khác chỉ có ghi chú. Link theo dõi hiện cho khách bấm vào → backend chỉ nhận https (chặn javascript:, data:, http
 * thường) và chỉ dùng với hãng không có mẫu link (other, ahamove) — hãng khác thì hệ thống tự sinh link nên ô này bị ẩn.
 */
export function buildShopStatusSchema(shipping: boolean) {
  return z
    .object({
      carrier: z.string(),
      trackingCode: z.string().trim(),
      trackingUrl: z.string().trim().max(500, "Tối đa 500 ký tự"),
      note: z.string().trim().max(500, "Tối đa 500 ký tự"),
    })
    .superRefine((v, ctx) => {
      if (!shipping) return;
      if (!isCarrierCode(v.carrier)) {
        ctx.addIssue({ code: "custom", path: ["carrier"], message: "Chọn hãng vận chuyển" });
      }
      if (!TRACKING_CODE_PATTERN.test(v.trackingCode)) {
        ctx.addIssue({ code: "custom", path: ["trackingCode"], message: "Mã vận đơn gồm 4–40 ký tự chữ, số hoặc dấu gạch ngang (không có khoảng trắng)" });
      }
      // Link theo dõi chỉ kiểm khi hãng không có mẫu (ô đang hiện) — hãng có mẫu thì ô bị ẩn, giá trị cũ gõ dở không được chặn nút gửi. Vẫn là TUỲ CHỌN.
      if (carrierNeedsTrackingUrl(v.carrier) && v.trackingUrl !== "" && !isHttpsUrl(v.trackingUrl)) {
        ctx.addIssue({ code: "custom", path: ["trackingUrl"], message: "Link theo dõi phải bắt đầu bằng https://" });
      }
    });
}
export type ShopStatusInput = z.infer<ReturnType<typeof buildShopStatusSchema>>;

/*
 * Huỷ đơn của shop (backend ShopCancelOrderRequest, PLAN-0027): MÃ lý do chuẩn + ghi chú tuỳ chọn ≤ 255 (backend ghép "<nhãn>: <ghi chú>").
 * "Lý do khác" không nói lên điều gì nếu thiếu ghi chú nên bắt nhập ≥ 5 ký tự. Không có lý do mặc định: một lý do được chọn sẵn có thể khiến shop vô tình
 * huỷ với mã bị tính vi phạm (hết hàng / sai giá).
 */
export const shopCancelOrderSchema = z
  .object({
    reasonCode: z.enum(SHOP_CANCEL_REASON_CODES, { error: "Chọn lý do huỷ đơn" }),
    note: z.string().trim().max(255, "Tối đa 255 ký tự"),
  })
  .superRefine((v, ctx) => {
    if (v.reasonCode === "other" && v.note.length < 5) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "Chọn \"Lý do khác\" thì cần ghi rõ lý do (tối thiểu 5 ký tự)" });
    }
  });
export type ShopCancelOrderInput = z.infer<typeof shopCancelOrderSchema>;

/* Lý do 10–500 ký tự (backend ShopReasonRequest) — dùng cho TỪ CHỐI yêu cầu huỷ của khách và GIA HẠN giao hàng; khách đọc được lý do từ chối. */
export const shopReasonSchema = z.object({
  reason: z.string().trim().min(10, "Nhập lý do (tối thiểu 10 ký tự)").max(500, "Tối đa 500 ký tự"),
});
export type ShopReasonInput = z.infer<typeof shopReasonSchema>;

/*
 * Báo đơn đang giao GIAO KHÔNG THÀNH CÔNG (backend DeliveryFailedRequest): lý do chuẩn + ghi chú 5–500 ký tự (khách và CSKH đều đọc được).
 * `goodsReturned` là hộp chọn riêng của dialog (boolean thuần) nên không nằm trong schema.
 */
export const deliveryFailedSchema = z.object({
  reasonCode: z.enum(DELIVERY_FAILED_REASON_CODES),
  note: z.string().trim().min(5, "Ghi chú cụ thể (tối thiểu 5 ký tự)").max(500, "Tối đa 500 ký tự"),
});
export type DeliveryFailedInput = z.infer<typeof deliveryFailedSchema>;
