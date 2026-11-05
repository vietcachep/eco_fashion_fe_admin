/*
 * Hàm định dạng dùng chung (tiền VND, ngày giờ, số). Thuần, không phụ thuộc
 * React — component và bảng gọi trực tiếp.
 *
 * Tiền: backend trả `MoneyResponse{amount,display}` — ưu tiên hiện `display`.
 * Hàm này cho các chỗ chỉ có chuỗi/số VND thô (form, tính tổng tại chỗ).
 */
const vnd = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  return vnd.format(n);
}

const num = new Intl.NumberFormat("vi-VN");

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return num.format(n);
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(d);
}

/* Ngày YYYY-MM-DD theo giờ máy — cho input type="date" và tham số báo cáo. */
export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ISO cho input type="datetime-local" (cắt giây, giờ máy). */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/* Ngược lại: chuỗi datetime-local → ISO UTC gửi backend. */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/*
 * Thời gian còn lại tới một hạn chót, nói gọn: "2 ngày 5 giờ" · "5 giờ 20 phút" · "35 phút".
 * `ms` ≤ 0 = đã quá hạn. Thuần: nơi gọi truyền `deadline − now` (lấy `now` từ state/hook, không gọi Date.now() lúc render).
 */
export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "Đã quá hạn";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "dưới 1 phút";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  return `${mins} phút`;
}

export function truncate(s: string | null | undefined, max = 80): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
