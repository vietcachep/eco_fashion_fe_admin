import { CircleAlertIcon } from "lucide-react";

/*
 * Dòng báo lỗi dưới ô nhập — nhẹ nhàng: chữ nhỏ, icon, màu destructive.
 * Mọi form RHF dùng chung để lỗi trông giống nhau.
 */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-destructive">
      <CircleAlertIcon className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}
