"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLinkIcon, MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SidebarBrand,
  SIDEBAR_COLORS,
  SIDEBAR_SURFACE,
} from "@/components/layout/sidebar-brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { ProfileDialog } from "@/features/identity/components/profile/profile-dialog";
import { useCurrentUser } from "@/features/identity/hooks/use-current-user";
import { useLogout } from "@/features/identity/hooks/use-logout";
import { ROUTES } from "@/lib/constants";
import { CHE_DO_MOCK } from "@/lib/mock/mock-admin-adapter";

/* URL web bán hàng để mở nhanh từ khu quản trị (env công khai, không hardcode). */
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || "";

/*
 * Header trên cùng của shell (dashboard).
 * Trái: nút menu mobile (Sheet chứa SidebarNav). Phải: link mở web bán hàng +
 * menu tài khoản (hồ sơ, đổi mật khẩu, đăng xuất).
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const logoutMutation = useLogout();
  const { data: me, isLoading } = useCurrentUser();

  const displayName = me?.fullName || me?.email || "Người dùng";
  const email = me?.email ?? "";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-1 items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
            <MenuIcon className="size-5" />
            <span className="sr-only">Mở menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 p-0" style={{ background: SIDEBAR_SURFACE }}>
            <SheetHeader
              className="px-[18px] py-4"
              style={{ borderBottom: `1px solid ${SIDEBAR_COLORS.footerBorder}` }}
            >
              <SheetTitle>
                <Link href={ROUTES.dashboard} onClick={() => setOpen(false)}>
                  <SidebarBrand />
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {CHE_DO_MOCK ? (
          <span className="hidden items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 sm:inline-flex dark:text-amber-400">
            Dữ liệu mẫu
          </span>
        ) : null}

        {STOREFRONT_URL ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="hidden text-muted-foreground sm:inline-flex"
            render={<a href={STOREFRONT_URL} target="_blank" rel="noreferrer" />}
          >
            <ExternalLinkIcon className="size-3.5" />
            Web bán hàng
          </Button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-9 gap-2 rounded-full pr-1 pl-2" />}
          >
            {isLoading ? (
              <Skeleton className="hidden h-4 w-20 rounded sm:block" />
            ) : (
              <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
                {displayName}
              </span>
            )}
            {isLoading ? (
              <Skeleton className="size-7 rounded-full" />
            ) : (
              <InitialsAvatar name={displayName} src={me?.avatarUrl ?? undefined} className="size-7" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {isLoading ? (
                  <div className="space-y-1.5 py-0.5">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    {email ? (
                      <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
                    ) : null}
                    {me?.roleName ? (
                      <p className="pt-0.5 text-xs font-normal text-primary">{me.roleName}</p>
                    ) : null}
                  </>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>Hồ sơ cá nhân</DropdownMenuItem>
            <DropdownMenuItem render={<Link href={ROUTES.changePassword} />}>Đổi mật khẩu</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
}
