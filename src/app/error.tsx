"use client";

import { Button } from "@/components/ui/button";

/*
 * Global error boundary — an unexpected render error shows a friendly
 * recovery screen instead of a blank page (AGENTS.md Coding Rules).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">Đã có lỗi xảy ra</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
