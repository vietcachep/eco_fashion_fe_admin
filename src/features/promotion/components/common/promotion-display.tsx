import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PROMOTION_PHASE, PROMOTION_SCOPE_LABEL, statusMeta } from "@/lib/labels";
import type { PromotionAdminResponse, PromotionPhase } from "@/features/promotion/types/promotion";

/*
 * Phần hiển thị DÙNG CHUNG cho mã khuyến mãi ở cả cổng sàn lẫn cổng vendor:
 * mức giảm gọn, giai đoạn (đang chạy / sắp diễn ra / hết hạn / tắt) và phạm vi.
 * Gom một chỗ để hai cổng không lệch nhãn nhau.
 */

/* Hiển thị mức giảm gọn: "10% (tối đa 50.000 ₫)" / "50.000 ₫" / "Miễn phí vận chuyển". */
export function describeDiscount(p: PromotionAdminResponse): string {
  if (p.type === "free_shipping") return "Miễn phí vận chuyển";
  if (p.type === "percentage") return `${p.percentValue ?? ""}%${p.displayMaxDiscount ? ` (tối đa ${p.displayMaxDiscount.display})` : ""}`;
  return p.displayValue?.display ?? "";
}

/*
 * Backend chỉ trả isActive + startAt/endAt; giai đoạn do FE suy. Tắt thủ công
 * thắng thời gian (mã đang tắt vẫn hiện "Đang tắt" dù hết hạn) để chủ shop thấy
 * ngay công tắc nào đang quyết định.
 */
export function promotionPhase(p: Pick<PromotionAdminResponse, "isActive" | "startAt" | "endAt">, now: number = Date.now()): PromotionPhase {
  if (!p.isActive) return "off";
  if (new Date(p.startAt).getTime() > now) return "upcoming";
  if (new Date(p.endAt).getTime() < now) return "expired";
  return "running";
}

export function PromotionPhaseBadge({ promotion }: { promotion: Pick<PromotionAdminResponse, "isActive" | "startAt" | "endAt"> }) {
  const m = statusMeta(PROMOTION_PHASE, promotionPhase(promotion));
  return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
}

/*
 * Phạm vi mã: "Toàn sàn" hoặc "Gian hàng: <tên>". Backend chưa trả `shopName`
 * ở API quản trị, nên màn sàn truyền thêm `shopName` đã tra từ danh sách shop;
 * thiếu tên thì hiện "Gian hàng" kèm đuôi mã để vẫn phân biệt được.
 */
export function PromotionScopeBadge({ promotion, shopName }: { promotion: Pick<PromotionAdminResponse, "scope" | "shopId" | "shopName">; shopName?: string | null }) {
  if (promotion.scope !== "shop") {
    return <Badge variant="secondary">{PROMOTION_SCOPE_LABEL.platform}</Badge>;
  }
  const name = shopName ?? promotion.shopName;
  return (
    <Badge variant="outline" className="max-w-48" title={promotion.shopId ?? undefined}>
      <span className="truncate">{name ? `${PROMOTION_SCOPE_LABEL.shop}: ${name}` : `${PROMOTION_SCOPE_LABEL.shop} …${promotion.shopId?.slice(-4) ?? ""}`}</span>
    </Badge>
  );
}
