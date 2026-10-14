"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { firstAllowedRoute, landingScope, ROUTES } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import type { PermissionCode } from "@/lib/permission-codes.generated";
import { ForbiddenScreen } from "@/components/shared/forbidden-screen";
import {
  useCurrentUser,
  useHasPermission,
} from "@/features/identity/hooks/use-current-user";
import { useShopMemberships } from "@/features/shop/hooks/use-shop-membership";

/*
 * Route guards for the two route groups. Both wait for the silent session
 * bootstrap (`bootstrapped`) before acting, so a logged-in user reloading a
 * protected page never flashes the login screen while the access token is being
 * restored from the refresh cookie.
 */

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/*
 * Protects authenticated routes (the (dashboard) shell). While the session is
 * still being restored it shows a loader; once settled with no token it
 * redirects to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (bootstrapped && !accessToken) router.replace(ROUTES.login);
  }, [bootstrapped, accessToken, router]);

  if (!bootstrapped || !accessToken) return <FullPageLoader />;
  return <>{children}</>;
}

/*
 * Keeps already-logged-in users out of the public auth pages: if a session is
 * found, redirect to the dashboard. The page renders immediately so login is
 * never delayed for genuine guests.
 */
/*
 * Skeleton mặc định trong lúc chờ hồ sơ /me — khung tiêu đề + khối nội dung.
 * Màn nào có layout riêng thì truyền `fallback` để khớp đúng (Rule 1: skeleton
 * khớp layout, không giật).
 */
function PermissionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/*
 * Chặn quyền TẠI CHỖ: thiếu quyền thì thay nội dung bằng màn 403 nhưng GIỮ
 * NGUYÊN URL + sidebar + header — nhân viên biết mình đang ở đâu, và nút Quay
 * lại của trình duyệt không rơi vào vòng lặp như cách redirect sang /403.
 *
 * Ba trạng thái, không phải hai: hồ sơ /me tải bất đồng bộ nên lúc đang tải
 * PHẢI hiện skeleton, không được hiện 403 — nếu không mỗi lần F5 sẽ thấy 403
 * nháy lên rồi mới ra nội dung, trông như hệ thống lỗi.
 *
 * Fail-closed: /me lỗi → coi như không có quyền.
 * Lưu ý: đây là lớp trải nghiệm, KHÔNG phải bảo mật — backend mới là nơi
 * enforce quyền thật.
 */
export function PermissionGuard({
  permission,
  fallback,
  children,
}: {
  /**
   * Mã quyền theo catalog backend, vd "IDENTITY.USER.READ".
   * Kiểu sinh từ catalog → gõ sai là TypeScript báo đỏ.
   */
  permission: PermissionCode;
  /** Skeleton riêng của màn (mặc định: khung tiêu đề + khối nội dung). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { isPending } = useCurrentUser();
  const allowed = useHasPermission(permission);

  if (isPending) return <>{fallback ?? <PermissionSkeleton />}</>;
  if (!allowed) return <ForbiddenScreen permissionCode={permission} />;
  /*
   * Suspense ở đây (một chỗ cho mọi màn): màn danh sách đọc useSearchParams
   * (hooks/use-list-state) — Next yêu cầu ranh giới Suspense khi prerender,
   * thiếu là build đỏ "useSearchParams() should be wrapped in a suspense
   * boundary". Fallback dùng lại skeleton của guard nên không giật bố cục.
   */
  return <Suspense fallback={fallback ?? <PermissionSkeleton />}>{children}</Suspense>;
}

/*
 * Chặn route-group vendor (`(vendor)/vendor/**`, PLAN-0002 §1/§3): user PHẢI là thành viên ĐANG HOẠT ĐỘNG của một gian hàng (dữ liệu từ
 * `GET /shop/session` gộp vào hồ sơ người dùng — xem features/identity/api/auth-api.ts getCurrentUser). Nhân viên sàn lạc vào đây (không thuộc shop nào)
 * → 403 TẠI CHỖ, GIỮ NGUYÊN URL + sidebar/header (đúng phong cách `PermissionGuard`, không redirect để khỏi vướng vòng lặp nút Back).
 * Gian hàng CHƯA DUYỆT / BỊ KHOÁ / BỊ TỪ CHỐI: backend 403 mọi route /shop/** nên hiện màn giải thích thay vì để từng màn báo lỗi.
 */
const SHOP_STATUS_NOTICE: Record<string, { title: string; description: string }> = {
  pending: {
    title: "Gian hàng đang chờ sàn duyệt",
    description: "Hồ sơ gian hàng của bạn đã được ghi nhận. Bạn sẽ dùng được cổng nhà cung cấp ngay khi sàn duyệt — thường trong 1–2 ngày làm việc.",
  },
  suspended: {
    title: "Gian hàng đang bị tạm khoá",
    description: "Sàn đã tạm khoá gian hàng của bạn nên các chức năng quản lý bị đóng. Vui lòng liên hệ bộ phận hỗ trợ nhà cung cấp để biết lý do và cách mở lại.",
  },
  rejected: {
    title: "Gian hàng không được duyệt",
    description: "Hồ sơ gian hàng chưa đạt yêu cầu của sàn. Vui lòng liên hệ bộ phận hỗ trợ nhà cung cấp để được hướng dẫn bổ sung.",
  },
};

export function RoleGuard({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { memberships, isPending } = useShopMemberships();
  const active = memberships.find((m) => m.status === "active");

  if (isPending) return <>{fallback ?? <PermissionSkeleton />}</>;
  if (!active) {
    return (
      <ForbiddenScreen
        title="Chỉ dành cho nhà cung cấp"
        description="Tài khoản của bạn chưa thuộc gian hàng nào đang hoạt động. Liên hệ quản trị sàn để được thêm vào một gian hàng."
      />
    );
  }
  const notice = SHOP_STATUS_NOTICE[active.shopStatus];
  if (notice) return <ForbiddenScreen title={notice.title} description={notice.description} />;
  return <Suspense fallback={fallback ?? <PermissionSkeleton />}>{children}</Suspense>;
}

/*
 * Đã đăng nhập mà vào trang auth → đưa tới màn ĐẦU TIÊN người đó có quyền
 * (không phải luôn /dashboard: nhân viên kho không có quyền dashboard sẽ gặp
 * 403 ngay câu chào). Chờ hồ sơ /me có mã quyền rồi mới điều hướng — chỉ có
 * token mà chưa có /me thì cứ hiện trang, không nháy.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: me } = useCurrentUser();
  const { memberships } = useShopMemberships();

  useEffect(() => {
    if (!bootstrapped || !accessToken || !me) return;
    const codes = me.permissionCodes ?? [];
    router.replace(firstAllowedRoute(codes, landingScope(codes, memberships.some((m) => m.status === "active"))));
  }, [bootstrapped, accessToken, me, memberships, router]);

  return <>{children}</>;
}
