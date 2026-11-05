import { BanIcon } from "lucide-react";

/*
 * Nhãn "Khách yêu cầu huỷ" ở danh sách đơn (`cancelRequestStatus === "pending"`): khách muốn huỷ đơn đang đóng gói và đang chờ shop
 * chấp nhận / từ chối — quá hạn xử lý hệ thống tự chấp nhận. Chỉ yêu cầu ĐANG CHỜ mới cần nổi bật; đã xử lý xem ở chi tiết đơn.
 */
export function CancelRequestChip({ status }: { status?: string | null }) {
  if (status !== "pending") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <BanIcon className="size-3" />
      Khách yêu cầu huỷ
    </span>
  );
}
