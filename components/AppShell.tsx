import Link from "next/link";
import type { ReactNode } from "react";

export type AppRoute = "/" | "/bereken" | "/rekenschema" | "/molverhouding";

const NAV: { href: AppRoute; label: string }[] = [
  { href: "/", label: "Vergelijkingen" },
  { href: "/bereken", label: "Molecuulmassa" },
  { href: "/rekenschema", label: "Rekenschema" },
  { href: "/molverhouding", label: "Molverhouding" },
];

export function AppNav({ current }: { current: AppRoute }) {
  return (
    <nav className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {NAV.map(({ href, label }) =>
        href === current ? (
          <span key={href} className="font-semibold text-white">
            {label}
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            className="text-blue-200 transition hover:text-white"
          >
            {href === "/" ? `← ${label}` : label}
          </Link>
        )
      )}
    </nav>
  );
}

export interface HeroTip {
  kicker: string;
  body: ReactNode;
}

interface AppPageProps {
  current: AppRoute;
  title: ReactNode;
  titleHighlight?: ReactNode;
  description: string;
  tips?: HeroTip[];
  children: ReactNode;
}

export function AppPage({
  current,
  title,
  titleHighlight,
  description,
  tips,
  children,
}: AppPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,.6) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <AppNav current={current} />

          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-200 ring-1 ring-white/20">
            chemisch rekenen · 4 havo / vwo
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            {title}
            {titleHighlight != null && (
              <>
                {" "}
                <span className="bg-gradient-to-r from-sky-300 to-emerald-300 bg-clip-text text-transparent">
                  {titleHighlight}
                </span>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-2xl text-blue-100">{description}</p>

          {tips && tips.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {tips.map((t) => (
                <div
                  key={t.kicker}
                  className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    {t.kicker}
                  </div>
                  <p className="mt-1 text-sm">{t.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

interface StepSectionProps {
  step?: number;
  title: string;
  description?: string;
  children: ReactNode;
  first?: boolean;
  id?: string;
  headerExtra?: ReactNode;
  className?: string;
}

export function StepSection({
  step,
  title,
  description,
  children,
  first,
  id,
  headerExtra,
  className = "",
}: StepSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 ${
        first ? "-mt-6 shadow-lg" : "mt-5 shadow-sm"
      } ${className}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {step != null && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
            {description && (
              <p className="text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {headerExtra}
      </div>
      {children}
    </section>
  );
}

/** Invoervelden in rekenschema-stijl */
export const inputClass =
  "w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-lg font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20";

export const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30";

export const btnDark =
  "rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-900";

export const btnGhost =
  "rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200";

export const btnSuccess =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export const chipExample =
  "rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-sm font-bold text-blue-700 transition hover:bg-blue-100";

export const chipExampleActive =
  "rounded-lg bg-blue-600 px-3 py-2 font-mono text-sm font-bold text-white";
