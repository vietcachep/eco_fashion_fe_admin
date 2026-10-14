import { z } from "zod";
import { toDayString } from "@/lib/format";

/*
 * Form "Chạy kỳ đối soát": chọn từ ngày / đến ngày (input type="date" → YYYY-MM-DD).
 * Backend từ chối kỳ chưa kết thúc (PAYOUT_INVALID_PERIOD) nên chặn sớm ở form:
 * đến ngày không muộn hơn hôm nay, từ ngày không sau đến ngày.
 */
export const payoutRunSchema = z
  .object({
    from: z.string().min(1, "Chọn từ ngày"),
    to: z.string().min(1, "Chọn đến ngày"),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { path: ["to"], message: "Đến ngày phải sau hoặc bằng từ ngày" })
  // `refine` chạy lúc submit nên `new Date()` luôn là hôm nay thật, không bị đóng băng ở lúc nạp module.
  .refine((v) => !v.to || v.to <= toDayString(new Date()), { path: ["to"], message: "Kỳ chưa kết thúc — chọn đến ngày không muộn hơn hôm nay" });

export type PayoutRunInput = z.infer<typeof payoutRunSchema>;
