import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* Hàng 5 sao tô theo điểm — dùng chung cho cổng sàn và cổng vendor. */
export function ReviewStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} className={cn("size-3.5", i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30", className)} />
      ))}
    </span>
  );
}
