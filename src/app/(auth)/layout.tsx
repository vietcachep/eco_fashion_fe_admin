import { GuestGuard } from "@/components/layout/route-guards";

/*
 * Layout for public auth pages — full-bleed, pages own their framing
 * (login uses a split-panel design). GuestGuard bounces already-logged-in
 * users to the dashboard (PLAN-0003).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestGuard>
      <div className="min-h-dvh">{children}</div>
    </GuestGuard>
  );
}
