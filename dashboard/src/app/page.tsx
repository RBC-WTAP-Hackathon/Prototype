"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, MessageSquarePlus, ShieldAlert, Smile, Users } from "lucide-react";
import type { DashboardData } from "@/lib/types";
import { Card } from "@/components/ui";
import { DimensionRadar, SentimentTrend, TopicBars } from "@/components/charts";
import { DepartmentHeatmap } from "@/components/heatmap";
import { InternTable } from "@/components/intern-table";
import { ReportsList } from "@/components/reports-list";
import { ProfileDrawer } from "@/components/profile-drawer";
import { SimulateDialog } from "@/components/simulate-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { InclusionInsights } from "@/components/inclusion-insights";
import { InboxList } from "@/components/inbox-list";

const POLL_MS = 3000;

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [dept, setDept] = useState("All");
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next: DashboardData = await res.json();
      // Highlight interns with check-ins we haven't seen yet (live Slack submissions)
      const ids = new Set(next.interns.flatMap((i) => i.checkins.map((c) => c.id)));
      if (seen.current) {
        const fresh = new Set(
          next.interns.filter((i) => i.checkins.some((c) => !seen.current!.has(c.id))).map((i) => i.user.id),
        );
        if (fresh.size) {
          setFlashIds(fresh);
          setTimeout(() => setFlashIds(new Set()), 2500);
        }
      }
      seen.current = ids;
      setData(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-muted">
        {error ? `Couldn't load dashboard: ${error}` : "Loading…"}
      </main>
    );
  }

  const departments = ["All", ...data.heatmap.map((h) => h.department)];
  const interns = dept === "All" ? data.interns : data.interns.filter((i) => i.user.department === dept);
  const open = data.interns.find((i) => i.user.id === openId) ?? null;
  const k = data.kpis;

  return (
    <div className="min-h-screen">
      {/* Nav bar — white, black links, like jobs.rbc.com */}
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-lg font-medium text-rbc-navy">TalentPulse</span>
          <nav className="hidden items-center gap-8 text-base text-ink md:flex" aria-label="Sections">
            <a href="#overview" className="hover:text-accent">Overview</a>
            <a href="#inclusion" className="hover:text-accent">Inclusion</a>
            <a href="#intern-list" className="hover:text-accent">Intern list</a>
            <a href="#reports" className="hover:text-accent">Reports</a>
            <a href="#inbox" className="hover:text-accent">Feedback</a>
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 font-ui text-xs text-muted sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-good" /> Live ·{" "}
              {data.source === "supabase" ? "Supabase" : "demo data"} · AI: {data.llm}
            </span>
            <NotificationBell alerts={data.alerts} onOpenIntern={setOpenId} />
          </div>
        </div>
      </header>

      {/* Hero banner — the site's aqua → mint → gold gradient */}
      <section id="overview" className="scroll-mt-4" style={{ background: "var(--hero)" }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-10 sm:px-6">
          <div>
            <h1 className="text-4xl font-medium leading-tight text-rbc-navy">Where intern voices make an impact.</h1>
            <p className="mt-2 text-base text-ink-2">
              Summer 2026 Interns · Week {data.currentWeek} · Weekly Summary
            </p>
          </div>
          <button
            onClick={() => setSimOpen(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-accent bg-accent px-4 py-3 font-ui text-lg font-bold leading-none text-white transition hover:border-accent-ink hover:bg-accent-ink"
          >
            <MessageSquarePlus size={18} aria-hidden /> Simulate check-in
          </button>
        </div>
      </section>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={<Smile size={16} />}
            label="Avg sentiment (this week)"
            value={k.avgSentiment.toFixed(2)}
            delta={k.avgSentimentDelta}
            deltaFmt={(d) => d.toFixed(2)}
          />
          <Kpi
            icon={<Users size={16} />}
            label="Check-in participation"
            value={`${k.participationPct}%`}
            delta={k.participationDelta}
            deltaFmt={(d) => `${d} pts`}
          />
          <Kpi
            icon={<AlertTriangle size={16} />}
            label="High risk of leaving"
            value={String(k.highRisk)}
            sub={`${k.topTalentAtRisk} top performer${k.topTalentAtRisk === 1 ? "" : "s"}`}
            tone={k.highRisk > 0 ? "critical" : undefined}
            href="#intern-list"
          />
          <Kpi
            icon={<ShieldAlert size={16} />}
            label="Open reports"
            value={String(k.openReports)}
            sub={`${k.urgentReports} urgent`}
            tone={k.urgentReports > 0 ? "critical" : undefined}
            href="#reports"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Cohort experience" subtitle="Average across all interns · out of 100" className="lg:col-span-1">
            <DimensionRadar
              series={[{ key: "cohort", label: "Cohort", scores: data.cohortRadar, style: "primary" }]}
              height={280}
            />
          </Card>
          <Card title="Cohort sentiment" subtitle="Weekly average from AI analysis of check-ins (−1 to 1)" className="lg:col-span-2">
            <SentimentTrend data={data.trend} height={280} />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            title="Experience by department"
            subtitle="Spot team-level patterns — groups under 3 are hidden"
            className="lg:col-span-2"
          >
            <DepartmentHeatmap rows={data.heatmap} />
          </Card>
          <Card title="What interns talk about" subtitle="Topic mentions, last 4 weeks">
            <TopicBars data={data.topics} />
          </Card>
        </div>

        <Card
          id="inclusion"
          title="Inclusion & risk by group"
          subtitle="Departments and self-identified groups that feel excluded or are showing issues over time"
        >
          <InclusionInsights data={data.inclusion} demo={data.source === "memory"} />
        </Card>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card
            id="intern-list"
            title="Intern list"
            subtitle="Sorted by risk of leaving"
            className="lg:col-span-2"
            action={
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="rounded-sm border border-input-stroke bg-white px-3 py-1.5 text-sm text-ink-2"
                aria-label="Filter by department"
              >
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            }
          >
            <InternTable interns={interns} onOpen={setOpenId} flashIds={flashIds} />
          </Card>
          <div className="space-y-4">
            <Card id="reports" title="Reports" subtitle="From Slack /report">
              <ReportsList
                reports={data.reports}
                interns={data.interns}
                onReview={async (id) => {
                  await fetch("/api/reports", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, status: "Reviewed" }),
                  });
                  load();
                }}
              />
            </Card>
            <Card id="inbox" title="Feedback & intro requests" subtitle="From the Slack bot menu">
              <InboxList
                items={data.inbox}
                onDone={async (id) => {
                  await fetch("/api/inbox", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, status: "Done" }),
                  });
                  load();
                }}
              />
            </Card>
          </div>
        </div>


      </main>

      {/* Footer — RBC careers blue bar */}
      <footer className="mt-6 bg-rbc-footer text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm sm:px-6">
          <a href="#overview" className="font-ui font-bold underline underline-offset-2">Back to top</a>
          <p className="mt-2 text-white/90">
            TalentPulse is a support and early-intervention tool. Anonymous reports never store identity; department
            views under 3 interns are suppressed.
          </p>
        </div>
      </footer>

      <ProfileDrawer intern={open} cohort={data.cohortRadar} onClose={() => setOpenId(null)} onChanged={load} />
      {simOpen && (
        <SimulateDialog
          interns={data.interns}
          onClose={() => setSimOpen(false)}
          onSubmitted={async (uid) => {
            setSimOpen(false);
            await load();
            setOpenId(uid);
          }}
        />
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  delta,
  deltaFmt,
  sub,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: number;
  deltaFmt?: (d: number) => string;
  sub?: string;
  tone?: "critical";
  href?: string;
}) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      {...(href
        ? {
            href,
            onClick: (e: React.MouseEvent) => {
              const target = document.getElementById(href.slice(1));
              if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            },
          }
        : {})}
      className={clsx(
        "block rounded-xl border border-card-border bg-surface p-5",
        href && "cursor-pointer transition hover:bg-rbc-sky focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-offset-2"
      )}
    >
      <div className="flex items-center gap-1.5 text-sm text-ink-2">
        {icon}
        {label}
      </div>
      <div className={clsx("mt-2 text-4xl font-medium", tone === "critical" ? "text-critical-ink" : "text-rbc-navy")}>
        {value}
      </div>
      {delta !== undefined && deltaFmt && (
        <div className={clsx("mt-1 font-ui text-xs", delta >= 0 ? "text-good-ink" : "text-critical-ink")}>
          {delta >= 0 ? "▲" : "▼"} {deltaFmt(Math.abs(delta))} vs last week
        </div>
      )}
      {sub && <div className="mt-1 font-ui text-xs text-muted">{sub}</div>}
      {href && <div className="mt-3 inline-flex items-center gap-1 rounded-sm bg-surface-2 px-2.5 py-1.5 font-ui text-xs text-rbc-navy">View ›</div>}
    </Tag>
  );
}
