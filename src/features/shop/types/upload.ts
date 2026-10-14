/*
 * Kết quả POST /uploads/media — Orval khai response `void` (controller thiếu @ApiOkResponse) nên viết tay.
 * Chép từ `eco_backend/src/modules/system/upload/upload.controller.ts` (UploadedMediaResponse).
 */
export interface UploadedMediaResponse {
  type: "image";
  /** URL Cloudinary — gửi tiếp vào `logoUrl` / `bannerUrl` / `proofUrl`. */
  url: string;
  name: string;
  width: number;
  height: number;
}
