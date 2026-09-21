"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { StatCard } from "@/components/shared/stat-card";
import { formatNumber, formatPercent } from "@/lib/format";
import { useAiUsage, useRecommendationStats } from "@/features/ai/hooks/use-ai-admin";

const SOURCE_LABEL: Record<string, string> = {
  for_you: "Dành cho bạn",
  similar: "Tương tự",
  bought_together: "Mua cùng",
  cart: "Gợi ý ở giỏ",
  chat: "Chatbot",
  collection: "Bộ sưu tập AI",
  search: "Tìm kiếm",
  compare: "So sánh",
  style: "Phân tích ảnh",
  faq: "FAQ",
};

/*
 * Chi phí AI (token / lượt gọi / USD ước tính theo ngày và tính năng, hạn mức
 * ngày) + hiệu quả dải gợi ý (hiển thị → bấm → thêm giỏ → mua).
 */
export function UsageScreen() {
  const [days, setDays] = useState(14);
  const usage = useAiUsage(days);
  const rec = useRecommendationStats(days);

  if (usage.error) return <ApiErrorState error={usage.error} fallback="Không tải được chi phí AI." />;
  const u = usage.data;
  const totalTokens = u?.byFeature.reduce((s, f) => s + f.tokens, 0) ?? 0;
  const totalCost = u?.byFeature.reduce((s, f) => s + Number(f.cost), 0) ?? 0;
  const budgetPct = u && u.budget > 0 ? Math.min(100, Math.round((u.usedToday / u.budget) * 100)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <NativeSelect aria-label="Khoảng ngày" className="w-32" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 30, 60].map((d) => (
            <option key={d} value={d}>
              {d} ngày
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Token hôm nay / hạn mức" value={u ? `${formatNumber(u.usedToday)}${u.budget ? ` / ${formatNumber(u.budget)}` : ""}` : "—"} hint={budgetPct !== null ? `${budgetPct}% hạn mức ngày` : "Không đặt hạn mức (EF_AI_DAILY_TOKEN_BUDGET=0)"} tone={budgetPct !== null && budgetPct >= 80 ? "warning" : "primary"} loading={usage.isPending} />
        <StatCard label={`Token ${days} ngày`} value={formatNumber(totalTokens)} loading={usage.isPending} />
        <StatCard label={`Chi phí ước tính ${days} ngày`} value={`$${totalCost.toFixed(4)}`} loading={usage.isPending} />
        <StatCard label="Lượt gọi" value={formatNumber(u?.byFeature.reduce((s, f) => s + f.calls, 0))} hint={u ? `${formatNumber(u.byFeature.reduce((s, f) => s + f.failed, 0))} lỗi` : undefined} loading={usage.isPending} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theo tính năng</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usage.isPending ? (
              <Skeleton className="m-4 h-40 rounded-lg" />
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Tính năng</TableHead>
                    <TableHead className="text-right">Lượt</TableHead>
                    <TableHead className="text-right">Token</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right">Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(u?.byFeature ?? []).map((f) => (
                    <TableRow key={f.feature}>
                      <TableCell className="font-mono text-xs">{f.feature}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.calls)}</TableCell>
                      <TableCell className="text-right">{formatNumber(f.tokens)}</TableCell>
                      <TableCell className="text-right">${f.cost}</TableCell>
                      <TableCell className={f.failed ? "text-right text-destructive" : "text-right"}>{formatNumber(f.failed)}</TableCell>
                    </TableRow>
                  ))}
                  {u?.byFeature.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                        Chưa có lượt gọi AI.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Theo ngày</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usage.isPending ? (
              <Skeleton className="m-4 h-40 rounded-lg" />
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Lượt</TableHead>
                    <TableHead className="text-right">Token</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(u?.byDay ?? []).map((d) => (
                    <TableRow key={d.day}>
                      <TableCell>{d.day}</TableCell>
                      <TableCell className="text-right">{formatNumber(d.calls)}</TableCell>
                      <TableCell className="text-right">{formatNumber(d.tokens)}</TableCell>
                      <TableCell className="text-right">${d.cost}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hiệu quả dải gợi ý ({days} ngày)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rec.error ? (
            <div className="p-4">
              <ApiErrorState error={rec.error} fallback="Không tải được thống kê gợi ý." compact />
            </div>
          ) : rec.isPending ? (
            <Skeleton className="m-4 h-40 rounded-lg" />
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">Hiển thị</TableHead>
                  <TableHead className="text-right">Bấm</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Thêm giỏ</TableHead>
                  <TableHead className="text-right">Mua</TableHead>
                  <TableHead className="text-right">Chuyển đổi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rec.data?.sources ?? []).map((s) => (
                  <TableRow key={s.source}>
                    <TableCell>{SOURCE_LABEL[s.source] ?? s.source}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.impressions)}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.clicks)}</TableCell>
                    <TableCell className="text-right">{formatPercent(s.ctr * 100)}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.addToCart)}</TableCell>
                    <TableCell className="text-right">{formatNumber(s.purchases)}</TableCell>
                    <TableCell className="text-right">{formatPercent(s.conversion * 100)}</TableCell>
                  </TableRow>
                ))}
                {rec.data?.sources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                      Chưa có tín hiệu hiển thị / bấm.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
