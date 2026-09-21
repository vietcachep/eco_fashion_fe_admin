"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { STAFF_ROLES } from "@/lib/constants";
import { useUpdateUser } from "@/features/identity/hooks/use-admin-users";
import { updateUserSchema, type UpdateUserInput } from "@/features/identity/schemas/create-staff-schema";
import type { UserProfileResponse } from "@/lib/api/generated/model";

/* Sửa họ tên / SĐT / vai của nhân viên (mở từ nút Sửa đã khoá quyền). */
export function EditUserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfileResponse;
}) {
  const update = useUpdateUser(user.id);
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { fullName: user.fullName, phone: user.phone ?? "", roleCode: user.roleCode as UpdateUserInput["roleCode"] },
  });
  const errors = form.formState.errors;

  useEffect(() => {
    if (open) form.reset({ fullName: user.fullName, phone: user.phone ?? "", roleCode: user.roleCode as UpdateUserInput["roleCode"] });
  }, [open, user, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa hồ sơ nhân viên</DialogTitle>
        </DialogHeader>
        <form
          id="edit-user-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            update.mutate(
              { fullName: input.fullName, phone: input.phone || null, roleCode: input.roleCode },
              { onSuccess: () => onOpenChange(false) },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-name">Họ tên</FieldLabel>
              <Input id="edit-name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FormMessage message={errors.fullName?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-phone">Số điện thoại</FieldLabel>
              <Input id="edit-phone" aria-invalid={!!errors.phone} {...form.register("phone")} />
              <FormMessage message={errors.phone?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-role">Vai trò</FieldLabel>
              <NativeSelect id="edit-role" {...form.register("roleCode")}>
                {STAFF_ROLES.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </NativeSelect>
              <FormMessage message={errors.roleCode?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="edit-user-form" disabled={update.isPending}>
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
