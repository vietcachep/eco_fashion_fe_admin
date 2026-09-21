import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

/*
 * Typography: Be Vietnam Pro (hỗ trợ tiếng Việt đầy đủ) cho cả body lẫn tiêu
 * đề (--font-heading trỏ cùng font, đậm hơn); Geist Mono cho mã đơn / SKU.
 */
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FITLY Quản trị",
    template: "%s | FITLY Quản trị",
  },
  description: "Khu quản trị cửa hàng thời trang FITLY — sản phẩm, đơn hàng, thanh toán, khuyến mãi, báo cáo.",
};

/*
 * Root layout: font + provider toàn cục (TanStack Query, Toaster).
 * Route group (auth)/(dashboard) tự định nghĩa shell bên dưới.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
