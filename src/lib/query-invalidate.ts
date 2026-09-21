import type { QueryClient } from "@tanstack/react-query";

/*
 * Làm mới cache theo TIỀN TỐ URL. Orval đặt queryKey = [url, params] với url
 * dạng `/api/v1/admin/users`, nên sau một mutation chỉ cần nêu đường dẫn
 * resource là mọi trang/bộ lọc của resource đó (và route con như /users/{id})
 * được refetch. Không tự đặt key tay cho endpoint sinh tự động (AGENTS.md).
 */
export function invalidateByPath(qc: QueryClient, ...paths: string[]) {
  return qc.invalidateQueries({
    predicate: (q) => {
      const head = q.queryKey[0];
      return typeof head === "string" && paths.some((p) => head.startsWith(p));
    },
  });
}
