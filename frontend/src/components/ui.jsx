import { useState } from "react";
import { LEVEL_CLASS, levelLabel } from "../lib/risk.js";

export function Card({ as: Tag = "section", className = "", children, ...props }) {
  return <Tag className={`card ${className}`} {...props}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, id, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-bold leading-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-moss">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RiskBadge({ level, risk, size = "sm" }) {
  const c = LEVEL_CLASS[level] ?? LEVEL_CLASS.LOW;
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ring-1 ring-inset ${c.chip} ${size === "lg" ? "text-sm" : "text-xs"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
        {levelLabel(level)}
      </span>
      {risk != null && <span className="w-10 text-right tabular-nums">{risk.toFixed(1)}</span>}
    </span>
  );
}

export function ScoreBar({ label, value, flagged }) {
  const pct = Math.max(0, Math.min(1, value ?? 0)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-moss">{label}</span>
        <span className="font-semibold tabular-nums">
          {value?.toFixed(2)}
          {flagged && <span className="ml-1.5 rounded bg-critical-soft px-1.5 py-0.5 text-[11px] font-semibold text-critical-fg">flagged</span>}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunk">
        <div className={`h-full rounded-full ${flagged ? "bg-critical" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CopyButton({ value, label = "Copy" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch { /* clipboard blocked: value is still selectable in the title tooltip */ }
  }
  return (
    <button type="button" onClick={copy} className="rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold text-moss hover:bg-sunk hover:text-ink" aria-label={`${label} ${value}`}>
      {done ? "Copied" : label}
    </button>
  );
}

export function Logo({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path d="M16 6l8 3v6.5c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5V9l8-3z" fill="none" stroke="rgb(var(--brand))" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.5 16.2l2.4 2.4 4.6-4.8" fill="none" className="stroke-paper" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Icon = {
  check: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" /></svg>,
  alert: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path fillRule="evenodd" d="M8.3 3.3a2 2 0 0 1 3.4 0l6.1 10.6A2 2 0 0 1 16 17H4a2 2 0 0 1-1.8-3.1L8.3 3.3zM10 7a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" /></svg>,
  x: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4z" /></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>,
  play: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M8 5.1v13.8a1 1 0 0 0 1.5.9l11-6.9a1 1 0 0 0 0-1.7l-11-6.9A1 1 0 0 0 8 5.1z" /></svg>,
  refresh: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></svg>,
  download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>,
  sun: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  moon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  menu: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  arrow: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path fillRule="evenodd" d="M10.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H4a1 1 0 1 1 0-2h9.6l-3.3-3.3a1 1 0 0 1 0-1.4z" clipRule="evenodd" /></svg>,
  back: (p) => <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path fillRule="evenodd" d="M9.7 15.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 1.4L6.4 9H16a1 1 0 1 1 0 2H6.4l3.3 3.3a1 1 0 0 1 0 1.4z" clipRule="evenodd" /></svg>,
};
