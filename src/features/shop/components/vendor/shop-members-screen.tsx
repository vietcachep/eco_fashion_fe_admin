"use client";

import { AddMemberButton } from "@/features/shop/components/vendor/add-member-dialog";
import { ShopMembersTable } from "@/features/shop/components/vendor/shop-members-table";

/*
 * Màn Nhân viên của gian hàng (vendor): danh sách nhân viên + nút "Thêm nhân viên" (chủ shop tạo tài khoản cho nhân viên — không có bước mời/chấp nhận).
 * Nút tự ẩn khi thiếu quyền shop.staff.invite.
 */
export function ShopMembersScreen() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <AddMemberButton />
      </div>
      <ShopMembersTable />
    </div>
  );
}
