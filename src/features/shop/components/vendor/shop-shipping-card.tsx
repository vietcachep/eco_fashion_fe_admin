"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { NativeSelect } from "@/components/shared/native-select";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSIONS } from "@/lib/constants";
import { useShopShippingSettings, useSaveShopShipping, useShopShippingLocations, type ShopShippingSettings } from "@/features/shop/hooks/use-shipping-settings";
import { pickupAddressSchema } from "@/features/shop/schemas/shipping-settings-schema";
import type { PickupAddress } from "@/types/shipping";

const EMPTY: PickupAddress = { name: "", phone: "", street: "", provinceId: 0, districtId: 0, wardCode: "", provinceName: "", districtName: "", wardName: "", addressSystem: "legacy_3level" };

export function ShopShippingCard() {
  const query = useShopShippingSettings();
  if (query.error) return <ApiErrorState compact error={query.error} fallback="Không tải được cấu hình lấy hàng." />;
  if (query.isPending || !query.data) return <Skeleton className="h-72 w-full rounded-xl" />;
  return <ShippingForm key={JSON.stringify(query.data)} initial={query.data} />;
}

/* Dữ liệu ba cấp nhất quán với adapter báo phí; bật hãng chỉ sau khi có địa chỉ lấy/hoàn hợp lệ. */
function ShippingForm({ initial }: { initial: ShopShippingSettings }) {
  const [enabled, setEnabled] = useState(initial.shippingCarrierEnabled ?? false);
  const [pickup, setPickup] = useState(initial.shippingPickup ?? EMPTY);
  const [returned, setReturned] = useState(initial.shippingReturn ?? initial.shippingPickup ?? EMPTY);
  const [same, setSame] = useState(!initial.shippingReturn || JSON.stringify(initial.shippingReturn) === JSON.stringify(initial.shippingPickup));
  const [validation, setValidation] = useState("");
  const save = useSaveShopShipping();
  const canEdit = usePermission(PERMISSIONS.shopProfileUpdate);
  async function submit() {
    const first = pickupAddressSchema.safeParse(pickup);
    const second = pickupAddressSchema.safeParse(same ? pickup : returned);
    if (enabled && (!first.success || !second.success)) { setValidation("Nhập đầy đủ tên, số điện thoại, địa chỉ và chọn tỉnh/quận/phường hợp lệ trước khi bật giao hàng qua hãng."); return; }
    setValidation("");
    await save.mutateAsync({ shippingCarrierEnabled: enabled, shippingPickup: first.success ? first.data : null, shippingReturn: second.success ? second.data : null }).catch(() => undefined);
  }
  return <Card><CardHeader><CardTitle className="text-base">Lấy hàng và trả hàng</CardTitle></CardHeader><CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">Cấu hình địa chỉ để GHN đến lấy kiện và báo phí đúng tuyến. Thay đổi chỉ áp dụng cho đơn mới.</p>
    <fieldset disabled={!canEdit || save.isPending} className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Giao đơn mới qua GHN</label>
      <AddressFields value={pickup} onChange={setPickup} prefix="pickup" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} />Nhận hàng hoàn tại cùng địa chỉ lấy hàng</label>
      {!same ? <AddressFields value={returned} onChange={setReturned} prefix="return" /> : null}
      {canEdit ? <Button type="button" disabled={save.isPending} onClick={() => void submit()}>{save.isPending ? "Đang lưu…" : "Lưu cấu hình lấy hàng"}</Button> : <p className="text-xs text-muted-foreground">Bạn đang xem; chỉ người có quyền sửa hồ sơ được đổi địa chỉ.</p>}
    </fieldset>
    {validation ? <p role="alert" className="text-sm text-destructive">{validation}</p> : null}
    {save.error ? <ApiErrorState compact error={save.error} fallback="Chưa lưu được địa chỉ lấy hàng." /> : null}
  </CardContent></Card>;
}

function AddressFields({ value, onChange, prefix }: { value: PickupAddress; onChange: (value: PickupAddress) => void; prefix: string }) {
  const provinces = useShopShippingLocations("provinces");
  const districts = useShopShippingLocations("districts", value.provinceId);
  const wards = useShopShippingLocations("wards", value.districtId);
  return <div className="grid gap-3 sm:grid-cols-2">
    <Field><FieldLabel htmlFor={`${prefix}-name`}>Người liên hệ</FieldLabel><Input id={`${prefix}-name`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field>
    <Field><FieldLabel htmlFor={`${prefix}-phone`}>Số điện thoại</FieldLabel><Input id={`${prefix}-phone`} type="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} /></Field>
    <Field className="sm:col-span-2"><FieldLabel htmlFor={`${prefix}-street`}>Số nhà, tên đường</FieldLabel><Input id={`${prefix}-street`} value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} /></Field>
    <Field><FieldLabel htmlFor={`${prefix}-province`}>Tỉnh/thành</FieldLabel><NativeSelect id={`${prefix}-province`} value={value.provinceId || ""} onChange={(e) => { const found = provinces.data?.find((p) => String(p.id) === e.target.value); onChange({ ...value, provinceId: Number(e.target.value), provinceName: found?.name ?? "", districtId: 0, districtName: "", wardCode: "", wardName: "" }); }}><option value="">Chọn tỉnh/thành</option>{provinces.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect></Field>
    <Field><FieldLabel htmlFor={`${prefix}-district`}>Quận/huyện (bộ địa chỉ demo)</FieldLabel><NativeSelect id={`${prefix}-district`} disabled={!value.provinceId} value={value.districtId || ""} onChange={(e) => { const found = districts.data?.find((p) => String(p.id) === e.target.value); onChange({ ...value, districtId: Number(e.target.value), districtName: found?.name ?? "", wardCode: "", wardName: "" }); }}><option value="">Chọn quận/huyện</option>{districts.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect></Field>
    <Field><FieldLabel htmlFor={`${prefix}-ward`}>Phường/xã</FieldLabel><NativeSelect id={`${prefix}-ward`} disabled={!value.districtId} value={value.wardCode} onChange={(e) => { const found = wards.data?.find((p) => String(p.code ?? p.id) === e.target.value); onChange({ ...value, wardCode: e.target.value, wardName: found?.name ?? "" }); }}><option value="">Chọn phường/xã</option>{wards.data?.map((p) => <option key={p.id} value={p.code ?? p.id}>{p.name}</option>)}</NativeSelect></Field>
    {provinces.error || districts.error || wards.error ? <div className="sm:col-span-2"><ApiErrorState compact error={provinces.error || districts.error || wards.error} fallback="Không tải được danh mục địa chỉ. Thử mở lại màn hình." /></div> : null}
  </div>;
}
