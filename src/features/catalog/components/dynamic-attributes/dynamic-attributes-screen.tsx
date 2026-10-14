"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ListIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { DataTable } from "@/components/shared/data-table";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PermissionGate } from "@/components/shared/permission-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { PERMISSIONS } from "@/lib/constants";
import { DYNAMIC_INPUT_TYPE, statusMeta } from "@/lib/labels";
import { useListState } from "@/hooks/use-list-state";
import { useDynamicAttributes } from "@/features/catalog/hooks/use-dynamic-attributes";
import { DynamicAttributeFormDialog } from "@/features/catalog/components/dynamic-attributes/dynamic-attribute-form-dialog";
import { DynamicAttributeValuesSheet } from "@/features/catalog/components/dynamic-attributes/dynamic-attribute-values-sheet";
import type { DynamicAttributeResponse } from "@/lib/api/generated/model";

const LOAD_ERROR = "Không tải được danh sách thuộc tính.";
const PAGE_SIZE = 15;
const DEFAULTS = { type: "" };

/* Bỏ dấu tiếng Việt + hạ chữ thường để "mau" tìm ra "Màu sắc". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/gi, "d")
    .toLowerCase();
}

/*
 * Kho thuộc tính động dùng chung cho mọi ngành `dynamic`. Backend trả CẢ MẢNG (~50 thuộc tính, không
 * phân trang) nên tìm kiếm / lọc kiểu / phân trang chạy ở client; từ khoá + kiểu đồng bộ lên URL
 * (?q=&type=) như các màn danh sách khác. Bấm một dòng → ngăn bên phải quản lý giá trị.
 */
export function DynamicAttributesScreen() {
  const { data, isPending, error } = useDynamicAttributes();
  const { filters, setFilter, search, setSearch, keyword } = useListState(DEFAULTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = fold(keyword.trim());
    return (data ?? []).filter(
      (a) => (!filters.type || a.inputType === filters.type) && (!kw || fold(`${a.code} ${a.name}`).includes(kw)),
    );
  }, [data, filters.type, keyword]);

  const tabs = useMemo(() => {
    const all = data ?? [];
    const count = (type: string) => all.filter((a) => a.inputType === type).length;
    return [
      { key: "", label: "Tất cả", count: all.length },
      { key: "select", label: DYNAMIC_INPUT_TYPE.select.label, count: count("select") },
      { key: "text", label: DYNAMIC_INPUT_TYPE.text.label, count: count("text") },
      { key: "number", label: DYNAMIC_INPUT_TYPE.number.label, count: count("number") },
    ];
  }, [data]);

  const columns: ColumnDef<DynamicAttributeResponse>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Mã",
        cell: ({ row }) => <code className="font-mono text-xs">{row.original.code}</code>,
      },
      {
        accessorKey: "name",
        header: "Tên thuộc tính",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "inputType",
        header: "Kiểu nhập",
        cell: ({ row }) => {
          const meta = statusMeta(DYNAMIC_INPUT_TYPE, row.original.inputType);
          return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
        },
      },
      {
        id: "values",
        header: "Số giá trị",
        cell: ({ row }) =>
          row.original.inputType === "select" ? (
            <span className="tabular-nums">{row.original.values.length}</span>
          ) : (
            <span className="text-muted-foreground" title="Kiểu nhập tay — không có danh sách giá trị">
              —
            </span>
          ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Hành động</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedId(row.original.id)}>
              <ListIcon className="size-3.5" />
              {row.original.inputType === "select" ? "Quản lý giá trị" : "Chi tiết"}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (error) return <ApiErrorState error={error} fallback={LOAD_ERROR} />;

  return (
    <div className="flex flex-col gap-3">
      <FilterTabs tabs={tabs} value={filters.type} onChange={(k) => setFilter("type", k)} />
      <DataTable
        columns={columns}
        data={rows}
        pageSize={PAGE_SIZE}
        loading={isPending}
        searchPlaceholder="Tìm theo mã hoặc tên…"
        searchValue={search}
        onSearchChange={setSearch}
        toolbar={
          <PermissionGate permission={PERMISSIONS.dynamicAttributeManage}>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="size-4" />
              Thêm thuộc tính
            </Button>
          </PermissionGate>
        }
      />

      <DynamicAttributeFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        // Tạo xong thuộc tính Lựa chọn → mở luôn ngăn giá trị để nhập danh sách giá trị.
        onCreated={(attr) => attr.inputType === "select" && setSelectedId(attr.id)}
      />
      {selectedId ? <DynamicAttributeValuesSheet attributeId={selectedId} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
