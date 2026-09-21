import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api";

/*
 * Orval mutator: mọi hook sinh ra gọi backend qua hàm này, tức qua axios
 * instance chung (lib/api.ts) — interceptor JWT, refresh 401 và proxy /api áp
 * dụng tự động cho code sinh.
 *
 * BÓC ENVELOPE tại đây: backend NestJS bọc mọi body trong
 * `ApiResponse{success,message,data,error,requestId,timestamp}` nhưng Swagger
 * khai schema response là DTO TRẦN (TokenPairResponse, PageResponse…). Trả
 * `body.data` để kiểu Orval sinh ra khớp với dữ liệu hook nhận được; feature
 * hook KHÔNG phải viết `select: (r) => r.data` ở mọi nơi.
 *
 * Endpoint không theo envelope (không có — mọi route /api/v1 đều dùng
 * ApiResponse) sẽ trả nguyên body, nên kiểm `success` trước khi bóc.
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

function isEnvelope<T>(body: unknown): body is Envelope<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    "data" in body
  );
}

export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  return api
    .request<unknown>({ ...config, ...options })
    .then((response) =>
      isEnvelope<T>(response.data) ? response.data.data : (response.data as T),
    );
};

export default customInstance;
