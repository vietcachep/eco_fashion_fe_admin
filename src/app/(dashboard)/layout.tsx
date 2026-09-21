import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/layout/route-guards";

/*
 * Shell được bảo vệ: sidebar desktop + header dính. Trang bên trong chỉ render
 * component của feature. AuthGuard bọc cả shell — chưa đăng nhập thì đưa về
 * /login sau khi khôi phục phiên im lặng xong.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
