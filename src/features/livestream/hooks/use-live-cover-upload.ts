"use client";
import { useMutation } from "@tanstack/react-query";
import { uploadControllerMedia } from "@/lib/api/generated/uploads/uploads";
export function useLiveCoverUpload() {
  return useMutation({
    mutationFn: async (file: File) =>
      (await uploadControllerMedia({ file })) as unknown as { url: string },
  });
}
