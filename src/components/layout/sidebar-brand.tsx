import { cn } from "@/lib/utils";

/*
 * Lockup thương hiệu trên sidebar: ô vuông coral chữ "F" + wordmark FITLY +
 * eyebrow "QUẢN TRỊ CỬA HÀNG". Dùng chung cho sidebar desktop và sheet mobile
 * để hai nơi đọc giống hệt nhau. `compact` = rail thu gọn chỉ còn ô "F".
 *
 * Không dùng file ảnh: web bán hàng (fashion_frontend_user) dùng logo template
 * Vineta; khu quản trị chỉ cần nhận diện nhanh và nhẹ (Rule 1).
 */
export function SidebarBrand({
  compact = false,
  eyebrow = "QUẢN TRỊ CỬA HÀNG",
}: {
  compact?: boolean;
  /** Dòng nhỏ dưới wordmark — scope vendor truyền "CỔNG NHÀ CUNG CẤP" (PLAN-0002 §2). */
  eyebrow?: string;
}) {
  return (
    <div className={cn("flex items-center", compact ? "justify-center" : "gap-2.5")}>
      <BrandGlyph />
      {!compact ? (
        <div className="leading-none">
          <div
            className="font-heading text-[19px] font-bold tracking-[.06em]"
            style={{ color: SIDEBAR_COLORS.brandText }}
          >
            FITLY
          </div>
          <div
            className="pt-1 text-[8.5px] font-semibold"
            style={{ color: SIDEBAR_COLORS.brandEyebrow, letterSpacing: ".14em" }}
          >
            {eyebrow}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Ô vuông bo góc chữ F — dùng cả ở trang đăng nhập (BrandMark). */
export function BrandGlyph({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[10px] font-heading font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: "linear-gradient(135deg,#ff8a7a,#ff6f61 55%,#e8564a)",
        boxShadow: "0 4px 12px -4px rgba(255,111,97,.6)",
      }}
    >
      F
    </span>
  );
}

/** Nền sidebar (aside desktop + sheet mobile). */
export const SIDEBAR_SURFACE = "linear-gradient(180deg,#1b1a20,#141318)";

/* Bảng màu thanh điều hướng — than tối + điểm nhấn coral của FITLY. */
export const SIDEBAR_COLORS = {
  brandText: "#f5f3ef",
  brandEyebrow: "#ff8a7a",
  sectionLabel: "#6b6873",
  chevron: "#7d7a86",
  groupIcon: "#a3a0ab",
  groupLabel: "#d4d1d8",
  groupActiveIcon: "#ff8a7a",
  groupActiveLabel: "#fbf9f7",
  groupActiveBg: "rgba(255,111,97,.12)",
  childColor: "#b3b0ba",
  childDot: "#54515c",
  childActiveColor: "#ffffff",
  childActiveBg: "#ff6f61",
  childActiveShadow: "0 4px 12px -4px rgba(255,111,97,.65)",
  badgeBg: "#ff6f61",
  footerName: "#f5f3ef",
  footerSub: "#8d8a95",
  footerBorder: "rgba(255,255,255,.07)",
} as const;
