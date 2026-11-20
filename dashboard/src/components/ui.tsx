import clsx from "clsx";
import { AlertTriangle, CircleCheck, Eye, Star } from "lucide-react";
import type { RiskLevel } from "@/lib/types";

export function Card({
  title,
  subtitle,
  action,
  className,
  id,
  children,
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={clsx("scroll-mt-4 rounded-xl border border-card-border bg-surface p-5", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-medium leading-tight text-heading">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const RISK_STYLE: Record<RiskLevel, { cls: string; Icon: typeof AlertTriangle; label: string }> = {
  High: { cls: "bg-critical/12 text-critical-ink border-critical/30", Icon: AlertTriangle, label: "High risk" },
  Watch: { cls: "bg-warning/15 text-ink border-warning/50", Icon: Eye, label: "Watch" },
  Low: { cls: "bg-good/10 text-good-ink border-good/30", Icon: CircleCheck, label: "Low risk" },
};

/** Status always ships icon + label — never color alone. */
export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const { cls, Icon, label } = RISK_STYLE[level];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-ui text-xs whitespace-nowrap", cls)}>
      <Icon size={12} aria-hidden />
      {label}
      {score !== undefined && <span className="opacity-70">· {score}</span>}
    </span>
  );
}

export function TopTalentBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border border-rbc-sky bg-rbc-sky px-2 py-0.5 font-ui text-xs text-rbc-blue whitespace-nowrap"
      title="Strong manager-rated performance and showing risk signals"
    >
      <Star size={12} aria-hidden /> Top talent at risk
    </span>
  );
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-sm px-3 py-2 font-ui text-sm transition disabled:opacity-50",
        variant === "primary" && "border border-accent bg-accent font-bold text-white hover:border-accent-ink hover:bg-accent-ink",
        variant === "secondary" && "border border-surface-2 bg-surface-2 text-rbc-navy hover:border-[#d5e0e5] hover:bg-[#d5e0e5]",
        variant === "ghost" && "text-accent hover:bg-surface-2 hover:text-accent-ink",
        className,
      )}
    />
  );
}
