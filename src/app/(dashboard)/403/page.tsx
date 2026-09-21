import { ForbiddenScreen } from "@/components/shared/forbidden-screen";

/*
 * Route /403 — đích redirect khi guard chặn quyền trước lúc vào được màn hình.
 * Nằm trong (dashboard) nên vẫn giữ sidebar + header: nhân viên biết mình đang
 * ở đâu trong hệ thống thay vì rơi ra một trang trống.
 */
export default function ForbiddenPage() {
  return <ForbiddenScreen />;
}
