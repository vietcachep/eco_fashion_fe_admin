import { BrandGlyph } from "@/components/layout/sidebar-brand";

/*
 * Khung chung cho các trang auth phụ (quên / đặt lại mật khẩu): brand, tiêu
 * đề, mô tả, thẻ chứa form — căn giữa, nền nhẹ. Trang login có bố cục riêng.
 */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-105">
        <div className="flex flex-col items-center gap-4 pb-6 text-center">
          <BrandGlyph size={48} />
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="pt-1.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-lg shadow-primary/[0.05]">{children}</div>
      </div>
    </div>
  );
}
