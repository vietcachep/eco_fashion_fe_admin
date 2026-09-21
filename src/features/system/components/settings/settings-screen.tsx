"use client";

import { useMemo, useState } from "react";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { usePermission } from "@/hooks/use-permission";
import { useSettings, useUpdateSetting } from "@/features/system/hooks/use-system";
import type { SettingRow } from "@/features/system/types/system";

const LOAD_ERROR = "Không tải được tham số vận hành.";

const GROUP_LABEL: Record<string, string> = {
  shop: "Cửa hàng",
  order: "Đơn hàng",
  shipping: "Vận chuyển",
  payment: "Thanh toán",
  review: "Đánh giá",
  ai: "Trợ lý AI",
  general: "Chung",
};

/*
 * Tham số vận hành, gom theo nhóm. Ô nhập theo KIỂU của giá trị hiện tại
 * (boolean → công tắc, number → số, string → chữ, object → JSON) vì backend
 * bắt giá trị mới đúng kiểu với mặc định. Lưu từng tham số một.
 */
export function SettingsScreen() {
  const { data, isPending, error } = useSettings();
  const canEdit = usePermission(PERMISSIONS.settingUpdate);

  const groups = useMemo(() => {
    const map = new Map<string, SettingRow[]>();
    for (const s of data ?? []) {
      const arr = map.get(s.groupCode) ?? [];
      arr.push(s);
      map.set(s.groupCode, arr);
    }
    return [...map.entries()];
  }, [data]);

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;
  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([group, rows]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{GROUP_LABEL[group] ?? group}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            {rows.map((s) => (
              /* key kèm updatedAt: lưu xong hàng remount với giá trị mới, không cần effect đồng bộ. */
              <SettingRowEditor key={`${s.key}:${s.updatedAt}`} row={s} canEdit={canEdit} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SettingRowEditor({ row, canEdit }: { row: SettingRow; canEdit: boolean }) {
  const update = useUpdateSetting();
  const kind = typeof row.value === "boolean" ? "boolean" : typeof row.value === "number" ? "number" : typeof row.value === "string" ? "string" : "json";
  const initial = kind === "json" ? JSON.stringify(row.value, null, 2) : String(row.value ?? "");
  const [text, setText] = useState(initial);
  const [bool, setBool] = useState(row.value === true);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const dirty = kind === "boolean" ? bool !== row.value : text !== initial;

  const save = () => {
    let value: unknown = text;
    if (kind === "boolean") value = bool;
    else if (kind === "number") value = Number(text);
    else if (kind === "json") {
      try {
        value = JSON.parse(text);
        setJsonError(null);
      } catch {
        setJsonError("JSON không hợp lệ");
        return;
      }
    }
    update.mutate({ key: row.key, value });
  };

  return (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(12rem,1fr)_minmax(0,1.5fr)_auto] sm:items-start sm:gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <code className="font-mono text-xs">{row.key}</code>
          {row.isPublic ? (
            <Badge variant="outline" className="text-[10px]">
              công khai
            </Badge>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.description ?? ""} · cập nhật {formatDateTime(row.updatedAt)}
        </p>
      </div>
      <div className="min-w-0">
        {kind === "boolean" ? (
          <label className="flex h-8 items-center gap-2 text-sm">
            <Switch checked={bool} disabled={!canEdit} onCheckedChange={setBool} />
            {bool ? "Bật" : "Tắt"}
          </label>
        ) : kind === "json" ? (
          <Textarea rows={3} className="font-mono text-xs" disabled={!canEdit} value={text} onChange={(e) => setText(e.target.value)} />
        ) : (
          <Input type={kind === "number" ? "number" : "text"} disabled={!canEdit} value={text} onChange={(e) => setText(e.target.value)} />
        )}
        {jsonError ? <p className="pt-1 text-xs text-destructive">{jsonError}</p> : null}
      </div>
      {canEdit ? (
        <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || update.isPending} onClick={save}>
          {update.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
          Lưu
        </Button>
      ) : null}
    </div>
  );
}
