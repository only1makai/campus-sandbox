import type { RequestStatus } from "@/types";

const STYLE: Record<RequestStatus, string> = {
  open: "bg-gold text-ink",
  fulfilled: "bg-live-green text-white",
  declined: "bg-tomato text-white",
  expired: "bg-border-soft text-text-secondary",
};

const LABEL: Record<RequestStatus, string> = {
  open: "Open",
  fulfilled: "Fulfilled",
  declined: "Declined",
  expired: "Expired",
};

export default function RequestStatusPill({ status }: { status: RequestStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 font-sans text-meta font-semibold ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
