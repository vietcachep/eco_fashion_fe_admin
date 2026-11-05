import type { Metadata } from "next";
import { PermissionGuard } from "@/components/layout/route-guards";
import { PERMISSIONS } from "@/lib/constants";
import { ShipmentsScreen } from "@/features/shipping/components/shipments/shipments-screen";
export const metadata: Metadata = { title: "GHN giả lập" };
export default function ShippingSimulatorPage() {
  return <PermissionGuard permission={PERMISSIONS.shippingSimulate}><ShipmentsScreen simulator /></PermissionGuard>;
}
