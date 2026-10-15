import type { Metadata } from "next";
import { BarChart3, Package, ShoppingBag } from "lucide-react";
import { BrandGlyph } from "@/components/layout/sidebar-brand";
import { LoginForm } from "@/features/identity/components/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

/*
 * Đăng nhập kiểu hai panel: panel thương hiệu than tối (chỉ desktop) + panel
 * form. Hiệu ứng nền thuần CSS (transform/opacity, GPU), không JS, tắt khi
 * prefers-reduced-motion — trang đăng nhập phải nhanh (Rule 1).
 */
export default function LoginPage() {
  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#141318] lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <style>{`
            @keyframes fitly-drift-1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(22%,-16%) scale(1.3)}}
            @keyframes fitly-drift-2{0%,100%{transform:translate(0,0) scale(1.15)}50%{transform:translate(-20%,18%) scale(1)}}
            @keyframes fitly-drift-3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18%,-18%) scale(1.25)}}
            .fitly-blob{position:absolute;border-radius:9999px;filter:blur(64px);mix-blend-mode:screen}
            @media (prefers-reduced-motion: reduce){.fitly-blob{animation:none!important}}
          `}</style>
          <div
            className="fitly-blob"
            style={{ width: "60%", height: "60%", top: "-15%", left: "-10%", opacity: 0.55, background: "radial-gradient(circle,#ff6f61,transparent 68%)", animation: "fitly-drift-1 14s ease-in-out infinite" }}
          />
          <div
            className="fitly-blob"
            style={{ width: "55%", height: "55%", bottom: "-15%", right: "-10%", opacity: 0.45, background: "radial-gradient(circle,#ffb199,transparent 68%)", animation: "fitly-drift-2 17s ease-in-out infinite" }}
          />
          <div
            className="fitly-blob"
            style={{ width: "45%", height: "45%", top: "35%", left: "30%", opacity: 0.35, background: "radial-gradient(circle,#ff8a7a,transparent 68%)", animation: "fitly-drift-3 15s ease-in-out infinite" }}
          />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141318]/80 via-[#141318]/10 to-transparent" />

        <div className="relative flex items-center gap-3">
          <BrandGlyph size={44} />
          <div className="leading-none">
            <div className="font-heading text-2xl font-bold tracking-[.06em] text-white">FITLY</div>
            <div className="pt-1 text-[10px] font-semibold tracking-[.14em] text-[#ff8a7a]">QUẢN TRỊ SÀN</div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md font-heading text-3xl font-bold leading-tight text-white">
            Một nơi để vận hành cả sàn thương mại điện tử
          </h1>
          <p className="max-w-md text-white/75">
            Gian hàng, sản phẩm & tồn kho, đơn hàng & đổi trả, thanh toán COD / PayOS, đối soát, khuyến mãi, đánh giá, báo cáo và trợ lý AI — cho từng vai nhân viên và nhà cung cấp.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {[
              { icon: Package, label: "Sản phẩm & kho" },
              { icon: ShoppingBag, label: "Đơn hàng" },
              { icon: BarChart3, label: "Báo cáo" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur"
              >
                <Icon className="size-3.5 text-[#ff8a7a]" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/40">© 2026 FITLY — Sàn thương mại điện tử</p>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(255,111,97,0.12), transparent), radial-gradient(ellipse 50% 35% at 95% 100%, rgba(255,111,97,0.08), transparent)",
          }}
        />

        <div className="relative w-full max-w-105">
          <div className="flex flex-col items-center gap-5 pb-7 text-center">
            <BrandGlyph size={52} />
            <div>
              <h2 className="font-heading text-[28px] font-bold tracking-tight">Chào mừng trở lại</h2>
              <p className="pt-2 text-[15px] leading-relaxed text-muted-foreground">
                Đăng nhập bằng tài khoản nhân viên <span className="font-semibold text-primary">FITLY</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-7 shadow-xl shadow-primary/[0.06]">
            <LoginForm />
          </div>

          <p className="pt-6 text-center text-xs text-muted-foreground">
            Tài khoản khách hàng không vào được khu quản trị. Liên hệ quản trị viên để được cấp tài khoản nhân viên.
          </p>
        </div>
      </div>
    </div>
  );
}
