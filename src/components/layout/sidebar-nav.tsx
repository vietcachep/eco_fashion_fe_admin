"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { SIDEBAR_NAV, type NavItem } from "@/lib/constants";
import { SIDEBAR_COLORS as C } from "@/components/layout/sidebar-brand";
import { useCurrentUser } from "@/features/identity/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/*
 * Thanh điều hướng sidebar. Mục render từ SIDEBAR_NAV (lib/constants.ts), icon
 * là component lucide (import lẻ từng icon — Rule 1).
 *  - mở rộng: mục lá là link; mục cha là accordion (tự mở mục chứa route đang
 *    active).
 *  - thu gọn (rail desktop): chỉ icon + tooltip khi rê chuột.
 * Dùng chung cho sidebar desktop và sheet mobile (luôn mở rộng).
 */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.chevron}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 transition-transform duration-150", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const { data: me } = useCurrentUser();

  /*
   * Chọn mục đang mở theo quy tắc "KHỚP CỤ THỂ NHẤT THẮNG": so khớp theo ĐOẠN
   * (tránh /order khớp nhầm /order-x), rồi trong các href khớp lấy href DÀI NHẤT
   * → luôn đúng 1 mục sáng, kể cả route con (/order/orders/FT-123 sáng mục
   * "Danh sách đơn").
   */
  const activeHref = useMemo(() => {
    const all: string[] = [];
    for (const group of SIDEBAR_NAV) {
      for (const item of group.items) {
        if (item.href) all.push(item.href);
        for (const child of item.children ?? []) all.push(child.href);
      }
    }
    return (
      all
        .filter((h) => pathname === h || pathname.startsWith(h + "/"))
        .sort((a, b) => b.length - a.length)[0] ?? null
    );
  }, [pathname]);

  const itemActive = (item: NavItem) =>
    item.href
      ? item.href === activeHref
      : (item.children?.some((c) => c.href === activeHref) ?? false);

  /*
   * Ẩn mục người dùng thiếu quyền (fail-closed khi /me đang tải). Mục không
   * khai `permission` luôn hiện. Lọc CẢ HAI cấp: cha bị lọc sạch con thì ẩn
   * luôn — không để lại nhóm rỗng bấm vào không ra gì.
   */
  const visibleNav = useMemo(() => {
    const perms = new Set(me?.permissionCodes ?? []);
    const allowed = (code?: string) => !code || perms.has(code);
    return SIDEBAR_NAV.map((group) => ({
      ...group,
      items: group.items
        .filter((item) => allowed(item.permission))
        .map((item) =>
          item.children
            ? { ...item, children: item.children.filter((c) => allowed(c.permission)) }
            : item,
        )
        .filter((item) => !item.children || item.children.length > 0),
    })).filter((group) => group.items.length > 0);
  }, [me]);

  // Mặc định mở mục cha chứa route đang active.
  const [open, setOpen] = useState<string[]>(() =>
    SIDEBAR_NAV.flatMap((g) => g.items)
      .filter((i) => i.children && itemActive(i))
      .map((i) => i.id),
  );

  const toggleOpen = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  return (
    <TooltipProvider delay={0}>
      <nav className="flex flex-col px-3 pt-1 pb-4">
        {visibleNav.map((group, gi) => (
          <div key={group.title}>
            {collapsed ? (
              gi > 0 ? (
                <div className="mx-2 my-2 border-t" style={{ borderColor: C.footerBorder }} />
              ) : null
            ) : (
              <div
                className={cn("px-2.5 pb-2 text-[10px] font-semibold", gi === 0 ? "pt-1" : "pt-5")}
                style={{ color: C.sectionLabel, letterSpacing: ".12em" }}
              >
                {group.title}
              </div>
            )}

            <ul className={cn("flex flex-col", collapsed ? "gap-1" : "gap-px")}>
              {group.items.map((item) => {
                const isParent = !!item.children?.length;
                const active = itemActive(item);
                const isOpen = open.includes(item.id);
                const Icon = item.icon;
                const iconColor = active ? C.groupActiveIcon : C.groupIcon;
                const labelColor = active ? C.groupActiveLabel : C.groupLabel;

                // ---- RAIL THU GỌN: icon + tooltip ----
                if (collapsed) {
                  const railClass =
                    "flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]";
                  const railStyle = active ? { background: C.groupActiveBg } : undefined;
                  return (
                    <li key={item.id} className="flex justify-center">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            isParent ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setCollapsed(false);
                                  if (!open.includes(item.id)) toggleOpen(item.id);
                                }}
                                className={railClass}
                                style={railStyle}
                              />
                            ) : (
                              <Link
                                href={item.href!}
                                onClick={onNavigate}
                                className={railClass}
                                style={railStyle}
                              />
                            )
                          }
                        >
                          <Icon size={20} color={iconColor} strokeWidth={2} />
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    </li>
                  );
                }

                // ---- MỞ RỘNG ----
                const rowStyle: React.CSSProperties = {
                  color: labelColor,
                  fontSize: "13.5px",
                  fontWeight: active ? 600 : 500,
                  background: active ? C.groupActiveBg : undefined,
                };
                const rowClass = cn(
                  "flex w-full cursor-pointer items-center gap-[11px] rounded-[10px] px-2.5 py-[9px] transition-colors",
                  !active && "hover:bg-white/[0.06]",
                );
                const rowInner = (
                  <>
                    <span className="flex size-[18px] shrink-0 items-center justify-center">
                      <Icon size={18} color={iconColor} strokeWidth={2} />
                    </span>
                    <span className="flex-1 truncate text-left">{item.title}</span>
                    {isParent ? <Chevron open={isOpen} /> : null}
                  </>
                );

                if (item.href && !isParent) {
                  return (
                    <li key={item.id}>
                      <Link href={item.href} onClick={onNavigate} className={rowClass} style={rowStyle}>
                        {rowInner}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleOpen(item.id)}
                      className={rowClass}
                      style={rowStyle}
                    >
                      {rowInner}
                    </button>

                    {isParent && isOpen ? (
                      <div className="pt-1 pb-1.5">
                        {/* Đường dọc mảnh nối nhóm con về mục cha; ml-[19px] canh tâm icon cha. */}
                        <ul
                          className="ml-[19px] flex flex-col gap-px border-l pl-2.5"
                          style={{ borderColor: C.footerBorder }}
                        >
                          {item.children!.map((child) => {
                            const cActive = child.href === activeHref;
                            const childStyle: React.CSSProperties = {
                              color: cActive ? C.childActiveColor : C.childColor,
                              fontSize: "12.5px",
                              fontWeight: cActive ? 600 : 500,
                              background: cActive ? C.childActiveBg : undefined,
                              boxShadow: cActive ? C.childActiveShadow : undefined,
                            };
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onNavigate}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] transition-colors",
                                    !cActive && "hover:bg-white/[0.05]",
                                  )}
                                  style={childStyle}
                                >
                                  <span
                                    className="size-[5px] shrink-0 rounded-full"
                                    style={{ background: cActive ? C.childActiveColor : C.childDot }}
                                  />
                                  <span className="truncate">{child.title}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </TooltipProvider>
  );
}
