"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/*
 * State chuẩn của một màn danh sách: trang (0-based cho DataTable), ô tìm kiếm
 * (debounce 350ms → `keyword` gửi API) và bộ lọc. Bộ lọc + keyword ĐỒNG BỘ LÊN
 * URL (?status=pending&q=…) để: dashboard link thẳng tới việc cần xử lý, F5
 * không mất bộ lọc, chia sẻ link cho đồng nghiệp được.
 *
 * Trang hiển thị = pageIndex + 1 (backend đếm từ 1). Đổi lọc/tìm → về trang đầu.
 */
export function useListState<F extends Record<string, string>>(defaults: F) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initial = useMemo(() => {
    const f = { ...defaults } as Record<string, string>;
    for (const k of Object.keys(defaults)) {
      const v = params.get(k);
      if (v !== null) f[k] = v;
    }
    return f as F;
  }, [defaults, params]);

  const [filters, setFiltersState] = useState<F>(initial);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(search);
      setPageIndex(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Ghi lọc + từ khoá lên URL (replace, không đẩy history).
  useEffect(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
    if (keyword) sp.set("q", keyword);
    const qs = sp.toString();
    const current = params.toString();
    if (qs !== current) router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, keyword, pathname, router, params]);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPageIndex(0);
  }, []);

  return {
    filters,
    setFilter,
    search,
    setSearch,
    keyword,
    pageIndex,
    setPageIndex,
    /** Trang gửi backend (đếm từ 1). */
    page: pageIndex + 1,
  };
}
