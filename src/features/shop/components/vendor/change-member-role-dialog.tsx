"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/shared/native-select";
import { SHOP_MEMBER_ROLE_LABEL } from "@/lib/labels";
import type { ShopMemberResponse } from "@/lib/api/generated/model";
import { useUpdateShopMemberRole } from "@/features/shop/hooks/use-shop-members";
import { shopMemberRoleSchema, type ShopMemberRoleInput } from "@/features/shop/schemas/shop-member-schema";

/*
 * Đổi vai một thành viên (PATCH /shop/members/:id). Dialog nhận `member` (null = đóng); phần thân tách riêng và gắn
 * `key={member.id}` để mỗi lần mở cho một người là form dựng mới với vai hiện tại — không setState trong effect.
 * Hạ chủ shop cuối cùng: backend từ chối 409 (SHOP_LAST_OWNER), toast hiện nguyên văn.
 */
export function ChangeMemberRoleDialog({ member, onClose }: { member: ShopMemberResponse | null; onClose: () => void }) {
  return (
    <Dialog open={!!member} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {member ? <ChangeRoleBody key={member.id} member={member} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleBody({ member, onClose }: { member: ShopMemberResponse; onClose: () => void }) {
  const update = useUpdateShopMemberRole();
  const form = useForm<ShopMemberRoleInput>({
    resolver: zodResolver(shopMemberRoleSchema),
    defaultValues: { roleCode: member.roleCode === "shop_owner" ? "shop_owner" : "shop_staff" },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Đổi vai của {member.fullName}</DialogTitle>
        <DialogDescription>
          Chủ gian hàng có toàn quyền (kể cả tài khoản ngân hàng và nhân viên); nhân viên chỉ làm các việc được giao.
        </DialogDescription>
      </DialogHeader>
      <form
        id="change-member-role-form"
        noValidate
        onSubmit={form.handleSubmit((input) => update.mutate({ id: member.id, roleCode: input.roleCode }, { onSuccess: onClose }))}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="member-new-role">Vai trò trong shop</FieldLabel>
            <NativeSelect id="member-new-role" {...form.register("roleCode")}>
              {Object.entries(SHOP_MEMBER_ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" form="change-member-role-form" disabled={update.isPending}>
          {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Lưu vai trò
        </Button>
      </DialogFooter>
    </>
  );
}
