import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="text-muted-foreground">Trang không tồn tại.</p>
      <Button nativeButton={false} render={<Link href={ROUTES.dashboard} />}>
        Về Dashboard
      </Button>
    </div>
  );
}
