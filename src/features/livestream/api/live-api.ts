import type { ProductCardResponse } from "@/lib/api/generated/model";
import type { PageResponse } from "@/types/common";
import {
  liveControllerViewer,
  liveControllerHeartbeat,
  liveControllerLeave,
} from "@/lib/api/generated/livestream/livestream";
import {
  shopLiveControllerList,
  shopLiveControllerDetail,
  shopLiveControllerCreate,
  shopLiveControllerEdit,
  shopLiveControllerCancel,
  shopLiveControllerListProducts,
  shopLiveControllerOptions,
  shopLiveControllerSetProducts,
  shopLiveControllerPin,
  shopLiveControllerStart,
  shopLiveControllerToken,
  shopLiveControllerEnd,
  shopLiveControllerMessages,
  shopLiveControllerModerate,
  shopLiveControllerReport,
} from "@/lib/api/generated/shop-livestream/shop-livestream";
import {
  adminLiveControllerList,
  adminLiveControllerDetail,
  adminLiveControllerStop,
  adminLiveControllerReports,
  adminLiveControllerProcess,
  adminLiveControllerRestrict,
} from "@/lib/api/generated/admin-livestream/admin-livestream";
import {
  shopLiveVoucherControllerList,
  shopLiveVoucherControllerCreate,
  shopLiveVoucherControllerClose,
  shopLiveVoucherControllerRevoke,
} from "@/lib/api/generated/shop-live-vouchers/shop-live-vouchers";
import {
  adminLiveVoucherControllerList,
  adminLiveVoucherControllerCreate,
  adminLiveVoucherControllerRevoke,
} from "@/lib/api/generated/admin-live-vouchers/admin-live-vouchers";
import type {
  CampaignInput,
  ContentReport,
  HostGrant,
  LiveCampaign,
  LiveMessage,
  LiveProduct,
  LiveReport,
  LiveSession,
  ModerationInput,
  SessionInput,
  SessionListQuery,
} from "../types/live";

/* Chỉ một biên ép kiểu cho PageResponse không generic và các object Swagger chưa mô tả đầy đủ.
 * Mọi URL/body/envelope/refresh do client Orval sinh và shared mutator xử lý, không có HTTP viết tay ở feature. */
const response = <T>(request: Promise<unknown>) => request as Promise<T>;
export const liveApi = {
  viewerGrant: (id: string) =>
    response<{ admissionId: string; token: string; serverUrl: string }>(
      liveControllerViewer(id),
    ),
  heartbeat: (id: string, admissionId: string) =>
    response<{ viewerCount: number }>(
      liveControllerHeartbeat(id, { admissionId }),
    ),
  leave: (id: string, admissionId: string) =>
    liveControllerLeave(id, { admissionId }),
  list: (platform: boolean, params: SessionListQuery) =>
    response<PageResponse<LiveSession>>(
      platform
        ? adminLiveControllerList(params)
        : shopLiveControllerList(params),
    ),
  detail: (id: string, platform = false) =>
    response<LiveSession>(
      platform ? adminLiveControllerDetail(id) : shopLiveControllerDetail(id),
    ),
  create: (data: SessionInput) =>
    response<LiveSession>(shopLiveControllerCreate(data)),
  update: (id: string, data: SessionInput & { version: number }) =>
    response<LiveSession>(shopLiveControllerEdit(id, data)),
  cancel: (id: string, version: number) =>
    response<LiveSession>(shopLiveControllerCancel(id, { version })),
  products: (id: string) =>
    response<PageResponse<LiveProduct>>(
      shopLiveControllerListProducts(id, { page: 1, size: 50 }),
    ),
  productOptions: (params: { page: number; size: number; q?: string }) =>
    response<PageResponse<ProductCardResponse>>(
      shopLiveControllerOptions(params),
    ),
  setProducts: (id: string, productIds: string[], version: number) =>
    response<LiveSession>(
      shopLiveControllerSetProducts(id, { productIds, version }),
    ),
  pin: (id: string, productId: string | null, version: number) =>
    response<LiveSession>(shopLiveControllerPin(id, { productId, version })),
  start: (id: string, rehearsal = false) =>
    response<HostGrant>(shopLiveControllerStart(id, { rehearsal })),
  hostToken: (id: string) => response<HostGrant>(shopLiveControllerToken(id)),
  end: (id: string) => response<LiveSession>(shopLiveControllerEnd(id, {})),
  messages: (id: string) =>
    response<LiveMessage[]>(shopLiveControllerMessages(id, { size: 50 })),
  moderate: (id: string, data: ModerationInput) =>
    shopLiveControllerModerate(id, data),
  report: (id: string) => response<LiveReport>(shopLiveControllerReport(id)),
  terminate: (id: string, reason: string) =>
    response<LiveSession>(adminLiveControllerStop(id, { reason })),
  reports: (params: { page: number; size: number; status?: string }) =>
    response<PageResponse<ContentReport>>(adminLiveControllerReports(params)),
  processReport: (
    id: string,
    decision: "dismissed" | "resolved",
    note: string,
  ) =>
    response<ContentReport>(adminLiveControllerProcess(id, { decision, note })),
  restrict: (shopId: string, restricted: boolean, reason: string) =>
    response<{ restricted: boolean }>(
      adminLiveControllerRestrict(shopId, { restricted, reason }),
    ),
  campaigns: (id: string, platform = false) =>
    response<LiveCampaign[]>(
      platform
        ? adminLiveVoucherControllerList(id)
        : shopLiveVoucherControllerList(id),
    ),
  createCampaign: (id: string, data: CampaignInput, platform = false) =>
    response<LiveCampaign>(
      platform
        ? adminLiveVoucherControllerCreate(id, data)
        : shopLiveVoucherControllerCreate(id, data),
    ),
  campaignAction: (
    id: string,
    campaignId: string,
    action: "close" | "revoke",
    reason: string,
    platform = false,
  ) =>
    response<LiveCampaign[]>(
      platform
        ? adminLiveVoucherControllerRevoke(id, campaignId, { reason })
        : action === "close"
          ? shopLiveVoucherControllerClose(id, campaignId, { reason })
          : shopLiveVoucherControllerRevoke(id, campaignId, { reason }),
    ),
};
