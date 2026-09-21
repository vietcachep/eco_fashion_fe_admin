"use client";

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminAiControllerAsk,
  adminAiControllerClassify,
  adminAiControllerCopy,
  adminAiControllerCreateDocument,
  adminAiControllerDeleteDocument,
  adminAiControllerDraftReply,
  adminAiControllerModerateNow,
  adminAiControllerRebuild,
  adminAiControllerReindexDocument,
  adminAiControllerSummarizeNow,
  adminAiControllerSupportUpdate,
  adminAiControllerUpdateDocument,
  useAdminAiControllerChatInsightsGet,
  useAdminAiControllerChatSession,
  useAdminAiControllerChatSessions,
  useAdminAiControllerCombos,
  useAdminAiControllerDocuments,
  useAdminAiControllerFlags,
  useAdminAiControllerIndexStatus,
  useAdminAiControllerInventoryInsights,
  useAdminAiControllerRecStats,
  useAdminAiControllerRevenueInsight,
  useAdminAiControllerSupportGet,
  useAdminAiControllerSupportList,
  useAdminAiControllerUsageSummary,
} from "@/lib/api/generated/admin-ai/admin-ai";
import type {
  AskRequest,
  ClassifyRequest,
  CopyRequest,
  SaveDocumentRequest,
  UpdateDocumentRequest,
  UpdateSupportRequest,
} from "@/lib/api/generated/model";
import { apiErrorMessage } from "@/lib/api-error";
import { invalidateByPath } from "@/lib/query-invalidate";
import { asPage } from "@/types/common";
import type {
  AiDocumentResponse,
  AiIndexStatus,
  AiUsageSummary,
  AskResult,
  ChatInsightsResponse,
  ChatSessionDetail,
  ChatSessionRow,
  ClassifyProductResponse,
  ComboSuggestionsResponse,
  CopyResult,
  InventoryInsightsResponse,
  ModerationFlagPage,
  RecommendationStatsResponse,
  RevenueInsightResponse,
  ReviewSummaryResponse,
  SupportRequestResponse,
} from "@/features/ai/types/ai";

/*
 * Khu quản trị AI — bọc hook Orval tag admin-ai. Swagger không khai schema
 * response nên `select` ép về DTO viết tay (types/ai.ts). Các insight backend
 * đã cache (1–6h) → staleTime dài, không refetch khi đổi tab.
 */
const P = "/api/v1/admin/ai";

// ---- Kho tri thức
export function useAiDocuments(params: { keyword?: string; kind?: string; page: number; size: number }) {
  return useAdminAiControllerDocuments(
    { q: params.keyword || undefined, kind: (params.kind || undefined) as never, page: params.page, size: params.size },
    { query: { select: (r) => asPage<AiDocumentResponse>(r), placeholderData: keepPreviousData, staleTime: 15_000 } },
  );
}
export function useAiIndexStatus() {
  return useAdminAiControllerIndexStatus({ query: { select: (r) => r as unknown as AiIndexStatus, staleTime: 30_000, refetchInterval: 60_000 } });
}
function useDocMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, success: string, failure: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidateByPath(qc, `${P}/documents`, `${P}/index`);
      toast.success(success);
    },
    onError: (e) => toast.error(apiErrorMessage(e, failure)),
  });
}
export function useSaveAiDocument() {
  return useDocMutation(
    ({ id, body }: { id?: string; body: SaveDocumentRequest }) =>
      id ? adminAiControllerUpdateDocument(id, body as UpdateDocumentRequest) : adminAiControllerCreateDocument(body),
    "Đã lưu tài liệu — worker đang nhúng.",
    "Lưu tài liệu thất bại.",
  );
}
export function useDeleteAiDocument() {
  return useDocMutation((id: string) => adminAiControllerDeleteDocument(id), "Đã xoá tài liệu.", "Xoá thất bại.");
}
export function useReindexAiDocument() {
  return useDocMutation((id: string) => adminAiControllerReindexDocument(id), "Đã đưa vào hàng đợi nhúng lại.", "Nhúng lại thất bại.");
}
export function useRebuildAiIndex() {
  return useDocMutation(() => adminAiControllerRebuild(), "Đã bắt đầu nhúng lại toàn bộ.", "Nhúng lại thất bại.");
}

// ---- Yêu cầu hỗ trợ
export function useSupportRequests(params: { status?: string; page: number; size: number }) {
  return useAdminAiControllerSupportList(
    { status: (params.status || undefined) as never, page: params.page, size: params.size },
    { query: { select: (r) => asPage<SupportRequestResponse>(r), placeholderData: keepPreviousData, staleTime: 15_000 } },
  );
}
export function useSupportRequest(id: string) {
  return useAdminAiControllerSupportGet(id, { query: { enabled: !!id, select: (r) => r as unknown as SupportRequestResponse, staleTime: 10_000 } });
}
export function useUpdateSupport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSupportRequest) => adminAiControllerSupportUpdate(id, body),
    onSuccess: () => {
      invalidateByPath(qc, `${P}/support`, "/api/v1/admin/reports");
      toast.success("Đã cập nhật yêu cầu hỗ trợ.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Cập nhật thất bại.")),
  });
}
export function useDraftSupportReply(id: string) {
  return useMutation({
    mutationFn: async () => (await adminAiControllerDraftReply(id)) as unknown as { draft: string; source: string },
    onError: (e) => toast.error(apiErrorMessage(e, "AI không soạn được nháp.")),
  });
}

// ---- Hội thoại chatbot
export function useChatSessions(params: { page: number; size: number }) {
  return useAdminAiControllerChatSessions(params, {
    query: { select: (r) => asPage<ChatSessionRow>(r), placeholderData: keepPreviousData, staleTime: 15_000 },
  });
}
export function useChatSession(id: string) {
  return useAdminAiControllerChatSession(id, { query: { enabled: !!id, select: (r) => r as unknown as ChatSessionDetail, staleTime: 30_000 } });
}
export function useChatInsights(days: number) {
  return useAdminAiControllerChatInsightsGet({ days }, { query: { select: (r) => r as unknown as ChatInsightsResponse, staleTime: 5 * 60_000 } });
}

// ---- Kiểm duyệt AI
export function useModerationFlags(params: { label?: string; page: number; size: number }) {
  return useAdminAiControllerFlags(
    { label: (params.label || undefined) as never, page: params.page, size: params.size },
    { query: { select: (r) => r as unknown as ModerationFlagPage, placeholderData: keepPreviousData, staleTime: 15_000 } },
  );
}
export function useModerateNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => adminAiControllerModerateNow(reviewId),
    onSuccess: () => {
      invalidateByPath(qc, `${P}/moderation-flags`);
      toast.success("Đã chạy kiểm duyệt AI lại.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Kiểm duyệt lại thất bại.")),
  });
}
export function useSummarizeReviews() {
  return useMutation({
    mutationFn: async (productId: string) => (await adminAiControllerSummarizeNow(productId)) as unknown as ReviewSummaryResponse | null,
    onSuccess: (r) => toast.success(r ? "Đã tạo lại tóm tắt đánh giá." : "Sản phẩm chưa đủ đánh giá để tóm tắt."),
    onError: (e) => toast.error(apiErrorMessage(e, "Tóm tắt thất bại.")),
  });
}

// ---- Nhận xét vận hành
export function useInventoryInsights() {
  return useAdminAiControllerInventoryInsights({ query: { select: (r) => r as unknown as InventoryInsightsResponse, staleTime: 10 * 60_000 } });
}
export function useRevenueInsight() {
  return useAdminAiControllerRevenueInsight({ query: { select: (r) => r as unknown as RevenueInsightResponse, staleTime: 10 * 60_000 } });
}
export function useComboSuggestions() {
  return useAdminAiControllerCombos({ query: { select: (r) => r as unknown as ComboSuggestionsResponse, staleTime: 10 * 60_000 } });
}
export function useAskAi() {
  return useMutation({
    mutationFn: async (body: AskRequest) => (await adminAiControllerAsk(body)) as unknown as AskResult,
    onError: (e) => toast.error(apiErrorMessage(e, "AI không trả lời được.")),
  });
}

// ---- Công cụ soạn
export function useAiCopy() {
  return useMutation({
    mutationFn: async (body: CopyRequest) => (await adminAiControllerCopy(body)) as unknown as CopyResult,
    onError: (e) => toast.error(apiErrorMessage(e, "AI không soạn được.")),
  });
}
export function useAiClassify() {
  return useMutation({
    mutationFn: async (body: ClassifyRequest) => (await adminAiControllerClassify(body)) as unknown as ClassifyProductResponse,
    onError: (e) => toast.error(apiErrorMessage(e, "AI không phân loại được.")),
  });
}

// ---- Chi phí & hiệu quả gợi ý
export function useAiUsage(days: number) {
  return useAdminAiControllerUsageSummary({ days }, { query: { select: (r) => r as unknown as AiUsageSummary, staleTime: 60_000 } });
}
export function useRecommendationStats(days: number) {
  return useAdminAiControllerRecStats({ days }, { query: { select: (r) => r as unknown as RecommendationStatsResponse, staleTime: 5 * 60_000 } });
}
