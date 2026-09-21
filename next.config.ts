import type { NextConfig } from "next";

/*
 * /api/* được proxy sang backend NestJS bởi Route Handler ở
 * src/app/api/[...path]/route.ts (KHÔNG phải rewrite) — chuyển tiếp
 * server-to-server, bỏ Origin của trình duyệt nên backend không cần CORS cho
 * khu quản trị. Đặt NEXT_PUBLIC_API_URL để gọi thẳng backend (khi đó backend
 * phải cho phép origin này trong EF_CORS_ORIGINS).
 *
 * Ảnh: Cloudinary (upload thật) + `/static/seed/*` từ backend (ảnh seed khi
 * chưa cấu hình Cloudinary). Bảng sản phẩm dùng <img> thường vì URL động.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
