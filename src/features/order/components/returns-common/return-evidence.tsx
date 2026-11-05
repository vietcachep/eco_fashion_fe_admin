import type { MediaItemResponse } from "@/lib/api/generated/model";

/*
 * Lưới ảnh minh chứng (khách / shop). Bấm mở bản gốc ở tab mới. Backend chỉ nhận URL do kho upload của hệ thống nên có thể
 * tin là `https` — vẫn dùng `noopener noreferrer`. Rỗng thì không hiện gì (nơi gọi tự quyết có tiêu đề hay không).
 */
export function ReturnEvidence({ title, items }: { title: string; items: MediaItemResponse[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="pb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((m, i) => (
          <a key={`${m.url}-${i}`} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border" title={m.name}>
            {m.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh động (Cloudinary)
              <img src={m.url} alt={m.name} className="size-24 object-cover" />
            ) : (
              <span className="flex size-24 items-center justify-center text-xs">Video</span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
