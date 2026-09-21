"use client";

import { useEffect, useRef } from "react";
import { refreshSession } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

/*
 * Khôi phục phiên im lặng — chạy MỘT lần khi app tải.
 *
 * Access token chỉ sống trong bộ nhớ nên tab mới / reload bắt đầu không có AT.
 * Ở đây: (1) rehydrate refresh token từ localStorage (store để skipHydration
 * tránh lệch SSR), (2) nếu có RT thì đổi lấy cặp token mới, (3) dù kết quả ra
 * sao cũng bật `bootstrapped` để route guard ngừng loader và quyết định. Người
 * chưa từng đăng nhập đơn giản là không có token → coi như đã đăng xuất.
 */
export function useSessionBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || useAuthStore.getState().bootstrapped) return;
    ran.current = true;

    (async () => {
      await useAuthStore.persist.rehydrate();
      const { accessToken, refreshToken } = useAuthStore.getState();
      if (!accessToken && refreshToken) {
        const token = await refreshSession();
        if (!token) useAuthStore.getState().clear();
      }
      useAuthStore.getState().setBootstrapped(true);
    })();
  }, []);
}
