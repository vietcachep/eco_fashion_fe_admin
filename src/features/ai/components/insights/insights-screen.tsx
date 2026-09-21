"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2Icon, SendIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import { useAskAi, useComboSuggestions, useInventoryInsights, useRevenueInsight } from "@/features/ai/hooks/use-ai-admin";

const LEVEL: Record<string, { label: string; tone: "danger" | "warning" | "success" | "neutral" }> = {
  out: { label: "Hết hàng", tone: "danger" },
  critical: { label: "Sắp hết", tone: "danger" },
  warning: { label: "Cần nhập", tone: "warning" },
  ok: { label: "Ổn", tone: "success" },
  stale: { label: "Bán chậm", tone: "neutral" },
};

/*
 * Nhận xét vận hành do AI viết trên số liệu thật: doanh thu 30 ngày vs 30
 * ngày trước, tốc độ bán theo biến thể, combo đồng mua, và ô "hỏi số liệu"
 * (agent gọi báo cáo có sẵn, không sinh SQL). Backend cache 1–6h.
 */
export function InsightsScreen() {
  return (
    <div className="flex flex-col gap-4">
      <AskCard />
      <RevenueInsightCard />
      <InventoryInsightCard />
      <CombosCard />
    </div>
  );
}

function AskCard() {
  const ask = useAskAi();
  const [q, setQ] = useState("");
  return (
    <Card className="border-primary/30">
      <CardContent className="flex flex-col gap-3 p-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim().length >= 3) ask.mutate({ question: q.trim() });
          }}
        >
          <SparklesIcon className="mt-2 size-4 shrink-0 text-primary" />
          <Input placeholder="Hỏi số liệu: 'Tuần này bán được bao nhiêu áo thun?', 'Sản phẩm nào sắp hết?'…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} />
          <Button type="submit" disabled={ask.isPending || q.trim().length < 3}>
            {ask.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
            Hỏi
          </Button>
        </form>
        {ask.data ? (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
            {ask.data.answer}
            <p className="pt-1 text-xs text-muted-foreground">
              {ask.data.tools.length ? `Dùng báo cáo: ${ask.data.tools.join(", ")} · ` : ""}
              {ask.data.source}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RevenueInsightCard() {
  const { data, isPending, error } = useRevenueInsight();
  if (error) return <ApiErrorState error={error} fallback="Không tải được nhận xét doanh thu." compact />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Doanh thu 30 ngày qua so với 30 ngày trước</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Doanh thu" value={data?.current.revenue.display ?? "—"} hint={data ? `Kỳ trước ${data.previous.revenue.display} (${data.deltaRevenuePct === null ? "—" : formatPercent(data.deltaRevenuePct)})` : undefined} tone="primary" loading={isPending} />
          <StatCard label="Đơn hàng" value={formatNumber(data?.current.orders)} hint={data ? `Kỳ trước ${formatNumber(data.previous.orders)} (${data.deltaOrdersPct === null ? "—" : formatPercent(data.deltaOrdersPct)})` : undefined} loading={isPending} />
          <StatCard label="Sản phẩm bán" value={formatNumber(data?.current.itemsSold)} loading={isPending} />
          <StatCard label="Hoàn tiền" value={data?.current.refunded.display ?? "—"} loading={isPending} />
        </div>
        {isPending ? <Skeleton className="h-16 w-full rounded-lg" /> : <AiNote text={data?.aiSummary} byAi={data?.generatedByAi} at={data?.generatedAt} />}
        {data?.topProducts.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {data.topProducts.map((p) => (
              <Badge key={p.slug} variant="secondary" className="font-normal">
                {p.name} · {formatNumber(p.quantity)} sp · {p.revenue.display}
              </Badge>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InventoryInsightCard() {
  const { data, isPending, error } = useInventoryInsights();
  if (error) return <ApiErrorState error={error} fallback="Không tải được nhận xét tồn kho." compact />;
  const items = (data?.items ?? []).filter((i) => i.level !== "ok").slice(0, 30);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tốc độ bán 30 ngày theo biến thể</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Hết hàng" value={formatNumber(data?.outCount)} tone="danger" loading={isPending} />
          <StatCard label="Sắp hết (< 7 ngày)" value={formatNumber(data?.criticalCount)} tone="danger" loading={isPending} />
          <StatCard label="Cần nhập sớm" value={formatNumber(data?.warningCount)} tone="warning" loading={isPending} />
          <StatCard label="Bán chậm" value={formatNumber(data?.staleCount)} loading={isPending} />
        </div>
        {isPending ? <Skeleton className="h-16 w-full rounded-lg" /> : <AiNote text={data?.aiSummary} byAi={data?.generatedByAi} at={data?.generatedAt} />}
        {items.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((i) => {
              const lv = LEVEL[i.level] ?? LEVEL.ok;
              return (
                <li key={i.variantId} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <StatusBadge tone={lv.tone}>{lv.label}</StatusBadge>
                  <span className="min-w-0 flex-1">
                    <Link href={`${ROUTES.product.products}/${i.productId}`} className="block truncate font-medium hover:underline">
                      {i.productName}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {i.label} · <code className="font-mono">{i.sku}</code> · còn {formatNumber(i.available)} · {i.dailyRate.toFixed(1)}/ngày
                      {i.daysLeft !== null ? ` · ~${i.daysLeft} ngày` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CombosCard() {
  const { data, isPending, error } = useComboSuggestions();
  if (error) return <ApiErrorState error={error} fallback="Không tải được gợi ý combo." compact />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Combo gợi ý từ cặp hay mua cùng (90 ngày)</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : data?.combos.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.combos.map((c) => (
              <li key={c.name} className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {c.name} <Badge variant="secondary">−{c.discountPercent}%</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.reason} · {c.evidence === "orders" ? `${formatNumber(c.orders)} đơn mua cùng` : "gần nhau theo vector"}
                </p>
                <ul className="text-xs">
                  {c.products.map((p) => (
                    <li key={p.id}>· {p.name}</li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={`${ROUTES.promotion.promotionNew}?type=percentage&value=${c.discountPercent}&appliesTo=product&targets=${encodeURIComponent(c.products.map((p) => p.id).join("\n"))}&name=${encodeURIComponent(c.name)}`}
                    />
                  }
                >
                  Tạo khuyến mãi
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa đủ dữ liệu đồng mua để gợi ý.</p>
        )}
        {data ? <p className="pt-3 text-xs text-muted-foreground">{data.generatedByAi ? "AI đặt tên & mức giảm" : "Theo luật"} · {formatDateTime(data.generatedAt)}</p> : null}
      </CardContent>
    </Card>
  );
}

function AiNote({ text, byAi, at }: { text?: string | null; byAi?: boolean; at?: string }) {
  if (!text) return <p className="text-sm text-muted-foreground">Chưa có nhận xét (chưa cấu hình OpenAI hoặc chưa đủ dữ liệu).</p>;
  return (
    <div className="rounded-lg bg-primary/5 px-3 py-2 text-sm">
      <p className="whitespace-pre-wrap">{text}</p>
      <p className="pt-1 text-xs text-muted-foreground">
        {byAi ? "Nhận xét bởi AI" : "Nhận xét theo luật"} · {formatDateTime(at)}
      </p>
    </div>
  );
}
