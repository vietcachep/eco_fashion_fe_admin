"use client";
import { useEffect, useState } from "react";

export function LiveElapsed({
  startedAt,
  endedAt,
  rehearsal,
}: {
  startedAt: string | null;
  endedAt: string | null;
  rehearsal: boolean;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!startedAt || endedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt, endedAt]);
  if (!startedAt || (!endedAt && !now)) return null;
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const seconds = Math.max(
    0,
    Math.floor((end - new Date(startedAt).getTime()) / 1000),
  );
  const remaining = Math.max(0, (rehearsal ? 600 : 3600) - seconds);
  const show = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return (
    <p className="font-mono text-xs text-muted-foreground">
      Đã phát {show(seconds)}
      {!endedAt ? ` · Còn ${show(remaining)}` : ""}
    </p>
  );
}
