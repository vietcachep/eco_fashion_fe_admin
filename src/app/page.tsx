import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/*
 * The app has no public landing page — the root URL goes straight
 * to the dashboard (auth guard will redirect to /login in PLAN-0002).
 */
export default function RootPage() {
  redirect(ROUTES.dashboard);
}
