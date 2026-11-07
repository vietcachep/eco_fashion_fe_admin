"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorState } from "@/components/shared/api-error-state";
import { useLiveCommands, useLiveModerators } from "../../hooks/use-livestream";

export function StudioModerators({ sessionId }: { sessionId: string }) {
  const query = useLiveModerators(sessionId);
  if (query.error)
    return (
      <ApiErrorState
        error={query.error}
        fallback="Không tải được nhân viên có thể điều hành."
      />
    );
  if (!query.data) return <Skeleton className="h-32 w-full" />;
  return (
    <ModeratorForm
      key={query.data.userIds.join(",")}
      sessionId={sessionId}
      initial={query.data.userIds}
      candidates={query.data.candidates}
    />
  );
}
function ModeratorForm({
  sessionId,
  initial,
  candidates,
}: {
  sessionId: string;
  initial: string[];
  candidates: { userId: string; fullName: string }[];
}) {
  const [selected, setSelected] = useState(initial);
  const commands = useLiveCommands();
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="font-semibold">Nhân viên điều hành</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Chỉ thành viên đang hoạt động đã được cấp quyền điều hành livestream.
          Phân công không tự cấp quyền phát hoặc xem doanh thu.
        </p>
      </div>
      <div className="space-y-2">
        {candidates.map((c) => (
          <label
            key={c.userId}
            className="flex items-center gap-3 rounded-lg border p-3 text-sm"
          >
            <input
              className="size-4 accent-primary"
              type="checkbox"
              checked={selected.includes(c.userId)}
              disabled={
                commands.moderators.isPending ||
                (selected.length >= 10 && !selected.includes(c.userId))
              }
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, c.userId]
                    : selected.filter((id) => id !== c.userId),
                )
              }
            />
            {c.fullName}
          </label>
        ))}
        {!candidates.length ? (
          <p className="text-sm text-muted-foreground">
            Chưa có nhân viên đủ quyền để phân công.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Đã chọn {selected.length}/10 nhân viên.
      </p>
      {commands.moderators.error ? (
        <ApiErrorState
          error={commands.moderators.error}
          fallback="Không lưu được phân công."
        />
      ) : null}
      <Button
        disabled={commands.moderators.isPending}
        onClick={() =>
          commands.moderators.mutate({ id: sessionId, userIds: selected })
        }
      >
        Lưu phân công
      </Button>
    </section>
  );
}
