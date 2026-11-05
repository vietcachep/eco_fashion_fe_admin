import type { OrderResponse, ShipmentResponse, ShippingLocationResponse, ShopShippingAddressRequest } from "@/lib/api/generated/model";

/* Hợp đồng shipping dùng ở nhiều feature, tái xuất từ OpenAPI để tránh DTO viết tay lệch backend. */
export type ShipmentSummary = ShipmentResponse;
export type ShippingLocation = ShippingLocationResponse;
export type PickupAddress = ShopShippingAddressRequest;
export type CarrierOrderFields = Pick<OrderResponse, "fulfilmentMode" | "collectionMode" | "carrierCodStatus" | "shipment" | "canShip"> & { canReconcile?: boolean; canPrintLabel?: boolean };