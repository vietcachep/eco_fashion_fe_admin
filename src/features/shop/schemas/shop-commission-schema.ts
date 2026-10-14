import { z } from "zod";

/*
 * Form sửa hoa hồng của một shop (PATCH /admin/shops/:id/commission, phía sàn).
 * Khớp UpdateCommissionRequest backend: 0–100%, tối đa 2 chữ số thập phân.
 */
export const shopCommissionSchema = z.object({
  commissionRate: z
    .number({ message: "Nhập tỉ lệ hoa hồng" })
    .min(0, "Không âm")
    .max(100, "Tối đa 100%")
    // Sai số dấu phẩy động (8.1*100 = 810.0000000000001) nên so với ngưỡng nhỏ thay vì ===.
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Tối đa 2 chữ số thập phân"),
});

export type ShopCommissionInput = z.infer<typeof shopCommissionSchema>;
