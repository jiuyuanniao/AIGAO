import { Link } from "@tanstack/react-router";
import { Star, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  REQUEST_STATUS_LABEL,
  type ApplicationStatus,
  type OrderStatus,
  type RequestStatus,
} from "@/lib/types";

export function SectionHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold md:text-[28px]">{title}</h2>
        {desc ? <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MoreLink({ to, label = "查看全部" }: { to: string; label?: string }) {
  return (
    <Link
      to={to as never}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-3.5 fill-clay text-clay" />
      <span className="font-medium">{value.toFixed(1)}</span>
      {count !== undefined ? (
        <span className="text-muted-foreground">({count})</span>
      ) : null}
    </span>
  );
}

const TONE: Record<string, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  brand: "bg-brand-soft text-brand",
  clay: "bg-clay-soft text-clay",
  muted: "bg-muted text-muted-foreground",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const REQUEST_TONE: Record<RequestStatus, keyof typeof TONE> = {
  draft: "muted",
  recruiting: "brand",
  matched: "clay",
  in_progress: "clay",
  completed: "neutral",
  cancelled: "muted",
};

const ORDER_TONE: Record<OrderStatus, keyof typeof TONE> = {
  pending_confirm: "clay",
  in_progress: "brand",
  pending_review: "clay",
  revision_required: "clay",
  completed: "neutral",
  cancelled: "muted",
  disputed: "muted",
};

const APPLICATION_TONE: Record<ApplicationStatus, keyof typeof TONE> = {
  submitted: "neutral",
  selected: "brand",
  not_selected: "muted",
  withdrawn: "muted",
  invalid: "muted",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Pill tone={REQUEST_TONE[status]}>{REQUEST_STATUS_LABEL[status]}</Pill>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Pill tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Pill>;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Pill tone={APPLICATION_TONE[status]}>{APPLICATION_STATUS_LABEL[status]}</Pill>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card-surface p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}