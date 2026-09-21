/*
 * Công cụ AI cho nhân viên dùng ở HAI feature (product: kiểm listing / gợi ý
 * phân loại ngay trong form; ai: màn công cụ) → type đặt ở src/types để không
 * feature nào import internals của feature kia. Chép từ backend
 * `src/modules/ai/insight/staff-insight.service.ts`.
 */
export interface ClassifyProductResponse {
  categorySlug: string | null;
  categoryName: string | null;
  gender: "nam" | "nu" | "unisex" | null;
  tags: string[];
  material: string | null;
  confidence: number;
  alternatives: Array<{ categorySlug: string; categoryName: string }>;
  source: string;
}

export interface PrecheckResponse {
  ready: boolean;
  score: number;
  issues: Array<{ severity: "block" | "warn" | "info"; field: string; problem: string; suggestion: string }>;
  missing: string[];
  source: string;
}

