import { StatusBadge } from "@/components/shared/status-badge";
import { LIVE_LABELS, type LiveState } from "../../types/live";
export function LiveSessionBadge({ state }: { state: LiveState }) {
  return (
    <StatusBadge
      tone={
        state === "live"
          ? "success"
          : state === "reconnecting" || state === "starting"
            ? "warning"
            : state === "terminated"
              ? "danger"
              : state === "scheduled"
                ? "pending"
                : "neutral"
      }
    >
      {LIVE_LABELS[state] || state}
    </StatusBadge>
  );
}
