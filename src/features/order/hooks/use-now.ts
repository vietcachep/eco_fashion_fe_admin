"use client";

import { useEffect, useState } from "react";

/*
 * "Bây giờ" cho các chỗ đếm ngược hạn xử lý. Render không được gọi Date.now() trực tiếp (không thuần) nên mốc được
 * giữ trong state và nhích theo chu kỳ; màn gọi MỘT lần rồi truyền xuống từng dòng để không mở một timer mỗi dòng bảng.
 * Chu kỳ 30 giây là đủ: hạn tính bằng giờ/phút, không cần chính xác tới giây.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
