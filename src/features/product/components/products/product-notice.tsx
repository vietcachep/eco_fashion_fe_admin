import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Khung ghi chú nhỏ trong màn sản phẩm (hướng dẫn / cảnh báo / lỗi nghiệp vụ
 * cần nằm lại trên màn, không biến mất như toast). Dùng chung form, biến thể,
 * ảnh và danh sách kiểm đăng bán để các ghi chú trông giống nhau.
 */
export function ProductNotice({
  tone,
  children,
  className,
}: {
  tone: "info" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "info" ? InfoIcon : TriangleAlertIcon;
  return (
    <div
      role={tone === "danger" ? "alert" : "note"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed",
        tone === "info" && "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        tone === "danger" && "border-destructive/30 bg-destructive/5 text-destructive",
        className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
