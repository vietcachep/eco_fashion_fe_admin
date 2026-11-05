import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShipmentsScreen } from "@/features/shipping/components/shipments/shipments-screen";
export const metadata: Metadata = { title: "Vận chuyển" };
export default function ShipmentsPage() {
  return <PermissionGuard permission={PERMISSIONS.orderRead}><ShipmentsScreen /></PermissionGuard>;
}
