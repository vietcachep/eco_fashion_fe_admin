import { z } from "zod";

export const pickupAddressSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên người gửi").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{9,12}$/, "Nhập số điện thoại hợp lệ"),
  street: z.string().trim().min(5, "Nhập số nhà, tên đường").max(255),
  provinceId: z.number().int().positive("Chọn tỉnh/thành"),
  districtId: z.number().int().positive("Chọn quận/huyện"),
  wardCode: z.string().min(1, "Chọn phường/xã"),
  provinceName: z.string().min(1), districtName: z.string().min(1), wardName: z.string().min(1),
  addressSystem: z.literal("legacy_3level"),
});
