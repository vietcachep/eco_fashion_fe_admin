"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { NativeSelect } from "@/components/shared/native-select";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PERMISSIONS, STAFF_ROLES } from "@/lib/constants";
import { useCreateStaff } from "@/features/identity/hooks/use-admin-users";
import {
  createStaffSchema,
  type CreateStaffInput,
} from "@/features/identity/schemas/create-staff-schema";

/*
 * Nút "Tạo nhân viên" + popup form. Nút tự khoá theo quyền identity.user.create
 * (lớp 2). Khách hàng tự đăng ký ở web bán hàng — admin chỉ tạo NHÂN VIÊN.
 */
export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  return (
    <PermissionGate permission={PERMISSIONS.userCreate}>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Tạo nhân viên
      </Button>
      <CreateUserDialog open={open} onOpenChange={setOpen} />
    </PermissionGate>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateStaff();
  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { email: "", fullName: "", roleCode: "sales", password: "", phone: "" },
  });
  const errors = form.formState.errors;

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo tài khoản nhân viên</DialogTitle>
          <DialogDescription>Nhân viên đăng nhập bằng email + mật khẩu này; nên đổi sau lần đầu.</DialogDescription>
        </DialogHeader>
        <form
          id="create-staff-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            create.mutate(
              {
                email: input.email,
                fullName: input.fullName,
                roleCode: input.roleCode,
                password: input.password,
                phone: input.phone || undefined,
              },
              { onSuccess: () => close(false) },
            ),
          )}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="staff-email">Email</FieldLabel>
              <Input id="staff-email" type="email" placeholder="ten@ecofashion.vn" aria-invalid={!!errors.email} {...form.register("email")} />
              <FormMessage message={errors.email?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-name">Họ tên</FieldLabel>
              <Input id="staff-name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FormMessage message={errors.fullName?.message} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="staff-role">Vai trò</FieldLabel>
                <NativeSelect id="staff-role" aria-invalid={!!errors.roleCode} {...form.register("roleCode")}>
                  {STAFF_ROLES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </NativeSelect>
                <FormMessage message={errors.roleCode?.message} />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-phone">Số điện thoại</FieldLabel>
                <Input id="staff-phone" placeholder="0901234567" aria-invalid={!!errors.phone} {...form.register("phone")} />
                <FormMessage message={errors.phone?.message} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="staff-password">Mật khẩu ban đầu</FieldLabel>
              <Input id="staff-password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
              <FormMessage message={errors.password?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Hủy
          </Button>
          <Button type="submit" form="create-staff-form" disabled={create.isPending}>
            {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Tạo tài khoản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
