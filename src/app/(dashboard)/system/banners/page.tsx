import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { BannersScreen } from "@/features/system/components/banners/banners-screen";

export const metadata: Metadata = { title: "Banner trang chủ" };

export default function BannersScreenPage() {
  return (
    <PermissionGuard permission={PERMISSIONS.bannerManage}>
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Banner trang chủ"
          description="Hero (đầu trang): mỗi banner là một slide lớn, theo thứ tự. Khối khuyến mãi (giữa trang): mọi banner trượt luân phiên theo thứ tự — dùng ảnh ngang khoảng 1600×520, chữ vẽ sẵn trong ảnh (tiêu đề chỉ làm mô tả ảnh). Banner đang tắt hoặc ngoài lịch hiệu lực không hiện; trang chủ cập nhật sau vài phút."
        />
        <BannersScreen />
      </div>
    </PermissionGuard>
  );
}
