"use client";

import Link from "next/link";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import {
  SidebarBrand,
  SIDEBAR_COLORS as C,
  SIDEBAR_SURFACE,
} from "@/components/layout/sidebar-brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/features/identity/hooks/use-current-user";

/*
 * Sidebar desktop của shell (dashboard): nền than tối, brand, menu nhóm, footer
 * người dùng. Thu gọn thành rail icon qua nút mép (state ở sidebar-store,
 * persist). Ẩn dưới lg; mobile dùng Sheet trong header.
 *
 * GHIM VÀO KHUNG NHÌN (`sticky top-0 h-dvh self-start`): menu cuộn trong chính
 * nó, điều hướng không làm sidebar "nhảy". `self-start` là mấu chốt — thiếu nó
 * flex `stretch` kéo aside cao bằng trang và sticky không còn khoảng để bám.
 */
export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const { data: me, isLoading } = useCurrentUser();

  const displayName = me?.fullName || me?.email || "Người dùng";
  const sub = me?.roleName ?? me?.email ?? "";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col self-start transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-16" : "w-[252px]",
      )}
      style={{ background: SIDEBAR_SURFACE }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center",
          collapsed ? "justify-center px-2 pt-4 pb-3" : "px-[18px] pt-5 pb-4",
        )}
      >
        <Link href={ROUTES.dashboard} aria-label="FITLY quản trị">
          <SidebarBrand compact={collapsed} />
        </Link>
      </div>

      {/* Nút thu gọn neo giữa cạnh phải — không đụng brand lẫn footer ở cả hai trạng thái. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        className="absolute -right-3 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-[0_2px_8px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-colors hover:bg-muted hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
      </button>

      {/* min-h-0: không có nó flex item không co dưới nội dung nên overflow-y-auto vô hiệu. */}
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div
        className={cn("flex items-center gap-2.5 p-3", collapsed && "justify-center")}
        style={{ borderTop: `1px solid ${C.footerBorder}` }}
      >
        {isLoading ? (
          <Skeleton className="size-[34px] shrink-0 rounded-[9px] bg-white/10" />
        ) : (
          <InitialsAvatar
            name={displayName}
            src={me?.avatarUrl ?? undefined}
            className="size-[34px] shrink-0 rounded-[9px] text-[13px]"
          />
        )}
        {!collapsed ? (
          isLoading ? (
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded bg-white/10" />
              <Skeleton className="h-3 w-28 rounded bg-white/10" />
            </div>
          ) : (
            <div className="min-w-0 flex-1 leading-snug">
              <div className="truncate text-[13px] font-semibold" style={{ color: C.footerName }}>
                {displayName}
              </div>
              {sub ? (
                <div className="truncate text-[11px]" style={{ color: C.footerSub }}>
                  {sub}
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
