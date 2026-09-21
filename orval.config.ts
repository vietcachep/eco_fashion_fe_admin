import { defineConfig } from "orval";

/*
 * Orval codegen: OpenAPI spec (openapi/api-docs.json, tải từ backend NestJS
 * `/docs/openapi.json` bằng `npm run api:spec`) → model TypeScript + hook
 * TanStack Query trong src/lib/api/generated (KHÔNG sửa tay). Mọi lời gọi sinh
 * ra đi qua axios instance chung nhờ mutator.ts, nên interceptor JWT + refresh
 * và proxy /api vẫn áp dụng.
 *
 * LƯU Ý ENVELOPE: backend khai schema response là DTO TRẦN (TokenPairResponse,
 * PageResponse…) nhưng body thật là `ApiResponse{success,message,data}`.
 * mutator.ts bóc `data` ra, nên kiểu Orval sinh ra khớp với thứ hook nhận được.
 */
export default defineConfig({
  ecoFashion: {
    input: {
      target: "./openapi/api-docs.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/lib/api/generated",
      schemas: "./src/lib/api/generated/model",
      client: "react-query",
      httpClient: "axios",
      clean: true,
      override: {
        mutator: {
          path: "./src/lib/api/mutator.ts",
          name: "customInstance",
        },
        query: {
          useQuery: true,
          signal: true,
        },
      },
    },
  },
});
