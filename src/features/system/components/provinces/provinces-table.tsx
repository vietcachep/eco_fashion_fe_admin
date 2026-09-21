"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/shared/data-table";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { PERMISSIONS } from "@/lib/constants";
import { usePermission } from "@/hooks/use-permission";
import { useProvinces, useUpdateProvince } from "@/features/system/hooks/use-system";
import type { ProvinceResponse } from "@/features/system/types/system";

const LOAD_ERROR = "Không tải được tỉnh/thành.";

/*
 * 63 tỉnh/thành + phí ship + bật/tắt giao. Sửa phí tại chỗ từng dòng (nhập số
 * VND → Lưu); công tắc giao hàng lưu ngay. Lọc client vì danh sách cố định.
 */
export function ProvincesTable() {
  const { data, isPending, error } = useProvinces();
  const canEdit = usePermission(PERMISSIONS.provinceManage);

  const columns: ColumnDef<ProvinceResponse>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Tỉnh / thành", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { accessorKey: "region", header: "Miền" },
      { id: "fee", header: "Phí ship", cell: ({ row }) => <FeeEditor row={row.original} canEdit={canEdit} /> },
      { id: "active", header: "Giao hàng", cell: ({ row }) => <ActiveToggle row={row.original} canEdit={canEdit} /> },
    ],
    [canEdit],
  );

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return <DataTable columns={columns} data={data ?? []} loading={isPending} pageSize={20} searchPlaceholder="Tìm tỉnh/thành…" />;
}

function FeeEditor({ row, canEdit }: { row: ProvinceResponse; canEdit: boolean }) {
  const update = useUpdateProvince();
  const [fee, setFee] = useState(row.shippingFee.amount);
  const dirty = fee !== row.shippingFee.amount;
  if (!canEdit) return <span>{row.shippingFee.display}</span>;
  return (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} step={1000} className="h-8 w-32" value={fee} onChange={(e) => setFee(e.target.value)} />
      <Button
        size="sm"
        variant={dirty ? "default" : "ghost"}
        className="h-8"
        disabled={!dirty || update.isPending}
        onClick={() => update.mutate({ code: row.code, body: { shippingFee: fee } })}
      >
        {update.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
      </Button>
    </div>
  );
}

function ActiveToggle({ row, canEdit }: { row: ProvinceResponse; canEdit: boolean }) {
  const update = useUpdateProvince();
  return (
    <Switch
      checked={row.isActive}
      disabled={!canEdit || update.isPending}
      aria-label={`Giao hàng ${row.name}`}
      onCheckedChange={(v) => update.mutate({ code: row.code, body: { isActive: v } })}
    />
  );
}
