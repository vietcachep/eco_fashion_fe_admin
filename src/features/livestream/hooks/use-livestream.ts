"use client";
import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { liveApi } from "../api/live-api";
import type {
  CampaignInput,
  ModerationInput,
  SessionInput,
  SessionListQuery,
} from "../types/live";

const key = ["livestream"] as const;
export function useLiveMonitorTransport() {
  return useMemo(
    () => ({
      viewerGrant: liveApi.viewerGrant,
      heartbeat: liveApi.heartbeat,
      leave: liveApi.leave,
    }),
    [],
  );
}
export function useLiveModerators(id: string) {
  return useQuery({
    queryKey: [...key, "moderators", id],
    queryFn: () => liveApi.moderators(id),
    enabled: !!id,
  });
}
export function useLiveSessions(platform: boolean, params: SessionListQuery) {
  return useQuery({
    queryKey: [...key, "list", platform, params],
    queryFn: () => liveApi.list(platform, params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}
export function useLiveSession(id: string, platform = false) {
  return useQuery({
    queryKey: [...key, "detail", platform, id],
    queryFn: () => liveApi.detail(id, platform),
    enabled: !!id,
    staleTime: 10_000,
    refetchInterval: (query) =>
      query.state.data &&
      ["starting", "live", "reconnecting"].includes(query.state.data.state)
        ? 15_000
        : false,
  });
}
export function useLiveProducts(id: string) {
  return useQuery({
    queryKey: [...key, "products", id],
    queryFn: () => liveApi.products(id),
    enabled: !!id,
  });
}
export function useLiveProductOptions(page: number, q: string, enabled = true) {
  return useQuery({
    queryKey: [...key, "options", page, q],
    queryFn: () =>
      liveApi.productOptions({ page, size: 15, q: q || undefined }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
export function useLiveMessages(id: string) {
  return useQuery({
    queryKey: [...key, "messages", id],
    queryFn: () => liveApi.messages(id),
    enabled: !!id,
  });
}
export function useLiveReport(id: string) {
  return useQuery({
    queryKey: [...key, "report", id],
    queryFn: () => liveApi.report(id),
    enabled: !!id,
  });
}
export function useLiveContentReports(page: number, status: string) {
  return useQuery({
    queryKey: [...key, "reports", page, status],
    queryFn: () =>
      liveApi.reports({ page, size: 15, status: status || undefined }),
    placeholderData: keepPreviousData,
  });
}
export function useLiveCampaigns(id: string, platform = false) {
  return useQuery({
    queryKey: [...key, "campaigns", id, platform],
    queryFn: () => liveApi.campaigns(id, platform),
    enabled: !!id,
  });
}

/* Snapshot từ HTTP là nguồn phục hồi sau reconnect, event chỉ yêu cầu làm mới đúng nhóm phòng. */
export function useInvalidateLive() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: key });
}
export function useLiveCommands() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: key });
  };
  return {
    moderators: useMutation({
      mutationFn: (v: { id: string; userIds: string[] }) =>
        liveApi.setModerators(v.id, v.userIds),
      onSuccess: invalidate,
    }),
    save: useMutation({
      mutationFn: (input: {
        id?: string;
        version?: number;
        data: SessionInput;
      }) =>
        input.id
          ? liveApi.update(input.id, { ...input.data, version: input.version! })
          : liveApi.create(input.data),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (v: { id: string; version: number }) =>
        liveApi.cancel(v.id, v.version),
      onSuccess: invalidate,
    }),
    start: useMutation({
      mutationFn: (v: { id: string; rehearsal: boolean }) =>
        liveApi.start(v.id, v.rehearsal),
      onSuccess: (grant) => {
        // Phát thử có ID mới: seed snapshot trước chuyển ID để không tháo video preview đang gắn track.
        qc.setQueryData([...key, "detail", false, grant.session.id], grant.session);
        invalidate();
      },
    }),
    reconnect: useMutation({
      mutationFn: (id: string) => liveApi.hostToken(id),
      onSuccess: invalidate,
    }),
    end: useMutation({
      mutationFn: (id: string) => liveApi.end(id),
      onSuccess: invalidate,
    }),
    pin: useMutation({
      mutationFn: (v: {
        id: string;
        productId: string | null;
        version: number;
      }) => liveApi.pin(v.id, v.productId, v.version),
      onSuccess: invalidate,
    }),
    products: useMutation({
      mutationFn: (v: { id: string; ids: string[]; version: number }) =>
        liveApi.setProducts(v.id, v.ids, v.version),
      onSuccess: invalidate,
    }),
    moderate: useMutation({
      mutationFn: (v: { id: string; data: ModerationInput }) =>
        liveApi.moderate(v.id, v.data),
      onSuccess: invalidate,
    }),
    terminate: useMutation({
      mutationFn: (v: { id: string; reason: string }) =>
        liveApi.terminate(v.id, v.reason),
      onSuccess: invalidate,
    }),
    restrict: useMutation({
      mutationFn: (v: {
        shopId: string;
        restricted: boolean;
        reason: string;
      }) => liveApi.restrict(v.shopId, v.restricted, v.reason),
      onSuccess: invalidate,
    }),
    processReport: useMutation({
      mutationFn: (v: {
        id: string;
        decision: "dismissed" | "resolved";
        note: string;
      }) => liveApi.processReport(v.id, v.decision, v.note),
      onSuccess: invalidate,
    }),
    createCampaign: useMutation({
      mutationFn: (v: {
        id: string;
        data: CampaignInput;
        platform?: boolean;
      }) => liveApi.createCampaign(v.id, v.data, v.platform),
      onSuccess: invalidate,
    }),
    campaignAction: useMutation({
      mutationFn: (v: {
        id: string;
        campaignId: string;
        action: "close" | "revoke";
        reason: string;
        platform?: boolean;
      }) =>
        liveApi.campaignAction(
          v.id,
          v.campaignId,
          v.action,
          v.reason,
          v.platform,
        ),
      onSuccess: invalidate,
    }),
  };
}
