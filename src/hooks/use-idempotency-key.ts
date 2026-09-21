"use client";

import { useRef } from "react";

/*
 * Khoá idempotency theo từng "ý định" thao tác — lớp chống trùng phía server.
 *
 * Khoá GIỮ NGUYÊN trong lúc request đang bay: hai cú bấm liên tiếp (hoặc lần
 * retry sau khi axios refresh 401) dùng lại cùng một khoá → backend gộp thành
 * một thao tác. Khi request kết thúc thì RESET, để lần bấm sau là một ý định
 * mới với khoá mới.
 *
 * Cách dùng trong mutation: gọi `next()` trong `mutationFn`, gọi `reset()` ở
 * `onSettled` (chạy cả khi thành công lẫn lỗi). Việc disable nút theo
 * `isPending` là lớp chặn phía client, độc lập với lớp này.
 *
 * Backend eco_backend đọc header `Idempotency-Key` ở checkout / thanh toán /
 * ghi sổ phiếu nhập kho — feature nào cần thì import hook này từ src/hooks.
 */
export function useIdempotencyKey() {
  const ref = useRef<string | null>(null);
  return {
    /** Khoá đang bay; sinh mới ở lần gọi đầu tiên. */
    next: () => {
      if (ref.current === null) ref.current = crypto.randomUUID();
      return ref.current;
    },
    /** Xoá khoá để thao tác kế tiếp là một ý định mới. */
    reset: () => {
      ref.current = null;
    },
  };
}
