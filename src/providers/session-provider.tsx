"use client";

import { useSessionBootstrap } from "@/features/identity/hooks/use-session";

/*
 * Mounts the one-time silent session bootstrap (restore the access token from
 * the refresh cookie) high in the tree so it runs once per app load, before the
 * route guards decide anything. Renders children unchanged.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  return <>{children}</>;
}
