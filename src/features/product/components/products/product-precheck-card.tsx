"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePrecheckProduct } from "@/features/product/hooks/use-product-ai";

const SEVERITY: Record<string, string> = {
  block: "bg-red-100 text-red-800",
  warn: "bg-amber-100 text-amber-800",
  info: "bg-sky-100 text-sky-800",
};

/*
 * "Kiểm listing bằng AI" trước khi đăng bán: thiếu gì, câu nào nên sửa. Không
 * đổi trạng thái sản phẩm. Chỉ hiện nút cho người có ai.copy.create.
 */
export function ProductPrecheckCard({ productId }: { productId: string }) {
  const precheck = usePrecheckProduct();
  const r = precheck.data;

  return (
    <PermissionGate permission={PERMISSIONS.aiCopyCreate}>
      <Card className="border-dashed py-0">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <SparklesIcon className="size-4 text-primary" />
              <span className="font-medium">Kiểm listing bằng AI</span>
              <span className="text-muted-foreground">— thiếu gì, câu nào dễ gây hiểu lầm, trước khi đăng bán.</span>
            </div>
            <Button size="sm" variant="outline" disabled={precheck.isPending} onClick={() => precheck.mutate(productId)}>
              {precheck.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {r ? "Kiểm lại" : "Kiểm ngay"}
            </Button>
          </div>
          {r ? (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                Điểm <b>{r.score}/100</b> ·{" "}
                <span className={r.ready ? "text-emerald-700" : "text-amber-700"}>
                  {r.ready ? "Sẵn sàng đăng bán" : "Chưa sẵn sàng"}
                </span>
                {r.missing.length ? <span className="text-muted-foreground"> · thiếu: {r.missing.join(", ")}</span> : null}
                <span className="text-xs text-muted-foreground"> ({r.source === "rule" ? "kiểm theo luật" : "AI"})</span>
              </p>
              {r.issues.length ? (
                <ul className="flex flex-col gap-1.5">
                  {r.issues.map((i, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className={cn("mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", SEVERITY[i.severity])}>
                        {i.field}
                      </span>
                      <span>
                        {i.problem}
                        {i.suggestion ? <span className="text-muted-foreground"> → {i.suggestion}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Không phát hiện vấn đề.</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
