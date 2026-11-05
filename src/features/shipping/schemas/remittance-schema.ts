import { z } from "zod";
export const remittanceSchema = z.object({ amount: z.string().regex(/^[1-9][0-9]*$/, "Nhập số tiền VND nguyên dương"), reference: z.string().trim().min(3, "Mã tham chiếu tối thiểu 3 ký tự").max(100), note: z.string().trim().max(500) });
export type RemittanceInput = z.infer<typeof remittanceSchema>;
