import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/layout/route-guards";

/*
 * Shell của route-group vendor (`/vendor/**`, PLAN-0002 §1/§5) — dùng LẠI
 * nguyên `Sidebar`/`Header` của `(dashboard)` qua tham số `scope="vendor"`
 * (PLAN-0002 bước 2: tham số hoá layout theo scope, không nhân đôi component).
 *
 * `AuthGuard` ở đây chỉ đòi hỏi ĐÃ ĐĂNG NHẬP (giống (dashboard)); việc "có
 * phải nhà cung cấp không" là `RoleGuard`, đặt Ở TỪNG page.tsx (không phải ở
 * đây) để khi bị chặn vẫn giữ nguyên sidebar/header — đúng quy ước
 * `PermissionGuard` hiện có (xem PLAN-0002 §5 Notes).
 */
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-dvh">
        <Sidebar scope="vendor" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header scope="vendor" />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
