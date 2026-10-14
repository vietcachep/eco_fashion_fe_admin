import { z } from "zod";

/* Trần 1 tỷ chặn nhập nhầm — khớp AdjustWalletDto backend (amount nguyên khác 0, note 5–500). */
const MAX_AMOUNT = 1_000_000_000;

export const walletAdjustSchema = z.object({
  amount: z
    .number({ message: "Nhập số tiền" })
    .int("Số tiền phải là số nguyên (VND)")
    .min(-MAX_AMOUNT, "Tối đa 1 tỷ đồng")
    .max(MAX_AMOUNT, "Tối đa 1 tỷ đồng")
    .refine((v) => v !== 0, "Số tiền phải khác 0"),
  note: z.string().trim().min(5, "Ghi chú tối thiểu 5 ký tự").max(500, "Tối đa 500 ký tự"),
});

export type WalletAdjustInput = z.infer<typeof walletAdjustSchema>;
