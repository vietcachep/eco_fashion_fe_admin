"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/sonner";
import { makeQueryClient } from "@/lib/query-client";
import { SessionProvider } from "@/providers/session-provider";

/*
 * Provider cấp app, mount một lần ở root layout: TanStack Query (server state),
 * khôi phục phiên im lặng, devtools (chỉ dev) và Toaster sonner. QueryClient tạo
 * trong useState để mỗi phiên trình duyệt có đúng một client (an toàn với
 * React strict mode / RSC streaming).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
