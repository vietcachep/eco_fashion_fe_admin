"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { FilePicker } from "@/components/shared/file-picker";
import { FormMessage } from "@/components/shared/form-message";
import { useCurrentUser } from "@/features/identity/hooks/use-current-user";
import { useUpdateAvatar, useUpdateProfile } from "@/features/identity/hooks/use-profile";
import { profileSchema, type ProfileInput } from "@/features/identity/schemas/profile-schema";

/*
 * Popup hồ sơ cá nhân (mở từ menu tài khoản trên header). Email + vai chỉ đọc;
 * sửa được họ tên, SĐT, ảnh đại diện. Ảnh upload riêng (PUT /users/me/avatar)
 * ngay khi chọn file, không đợi bấm Lưu.
 */
export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: me } = useCurrentUser();
  const update = useUpdateProfile();
  const avatar = useUpdateAvatar();
  const [file, setFile] = useState<File | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", phone: "" },
  });
  const errors = form.formState.errors;

  // Đổ dữ liệu /me vào form mỗi lần mở popup (form.reset là API của RHF, không phải setState).
  useEffect(() => {
    if (open && me) form.reset({ fullName: me.fullName ?? "", phone: me.phone ?? "" });
  }, [open, me, form]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setFile(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hồ sơ cá nhân</DialogTitle>
          <DialogDescription>
            {me?.email} · {me?.roleName}
          </DialogDescription>
        </DialogHeader>
        <form
          id="profile-form"
          noValidate
          onSubmit={form.handleSubmit((input) =>
            update.mutate(input, { onSuccess: () => onOpenChange(false) }),
          )}
        >
          <FieldGroup className="gap-4">
            <FilePicker
              file={file}
              previewUrl={me?.avatarUrl ?? null}
              label="Đổi ảnh đại diện"
              previewClassName="rounded-full"
              onError={(m) => toast.error(m)}
              onChange={(f) => {
                setFile(f);
                if (f) avatar.mutate(f);
              }}
            />
            <Field>
              <FieldLabel htmlFor="fullName">Họ tên</FieldLabel>
              <Input id="fullName" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FormMessage message={errors.fullName?.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
              <Input id="phone" placeholder="0901234567" aria-invalid={!!errors.phone} {...form.register("phone")} />
              <FormMessage message={errors.phone?.message} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button type="submit" form="profile-form" disabled={update.isPending}>
            {update.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
