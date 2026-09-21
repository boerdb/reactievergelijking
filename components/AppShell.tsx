import Link from "next/link";
import type { ReactNode } from "react";

export type AppRoute =
  | "/"
  | "/bereken"
  | "/rekenschema"
  | "/molverhouding"
  | "/zouten";

function IconEquation() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9h16l-3.2-3.2" />
      <path d="M20 15H4l3.2 3.2" />
    </svg>
  );
}

function IconAtom() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden
    >
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.6"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.6"
        transform="rotate(120 12 12)"
      />
    </svg>
  );
}

function IconSchema() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="7" y="2.5" width="10" height="6" rx="1.4" />
      <path d="M12 8.5v2.3" strokeLinecap="round" />
      <path d="M6 10.8h12" strokeLinecap="round" />
      <path d="M6 10.8V13M18 10.8V13" strokeLinecap="round" />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.4" />
      <rect x="13" y="13" width="8.5" height="8.5" rx="1.4" />
    </svg>
  );
}

function IconRatio() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="6.2" cy="12" r="4.2" />
      <circle cx="12" cy="9.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.6" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="18.4" cy="12" r="3.1" />
    </svg>
  );
}

function IconSalt() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="7.4" cy="12" r="5" />
      <path d="M7.4 9.6v4.8M5 12h4.8" />
      <circle cx="16.6" cy="12" r="5" />
      <path d="M14.2 12h4.8" />
    </svg>
  );
}

const NAV: {
  href: AppRoute;
  label: string;
  Icon: () => JSX.Element;
}[] = [
  { href: "/", label: "Vergelijkingen", Icon: IconEquation },
  { href: "/bereken", label: "Molecuulmassa", Icon: IconAtom },
  { href: "/rekenschema", label: "Rekenschema", Icon: IconSchema },
  { href: "/molverhouding", label: "Molverhouding", Icon: IconRatio },
  { href: "/zouten", label: "Zouten", Icon: IconSalt },
];

export function AppNav({ current }: { current: AppRoute }) {
  return (
    <nav
      className="ml-auto inline-flex items-center gap-1 rounded-2xl bg-white/10 p-1 ring-1 ring-white/15"
      aria-label="Hoofdnavigatie"
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = href === current;
        const className = active
          ? "group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-900 shadow-md"
          : "group relative flex h-10 w-10 items-center justify-center rounded-xl text-blue-100 transition hover:bg-white/15 hover:text-white";
        const inner = (
          <>
            <Icon />
            <span
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
              aria-hidden
            >
              {label}
            </span>
          </>
        );

        return active ? (
          <span key={href} aria-current="page" className={className}>
            {inner}
            <span className="sr-only">{label}</span>
          </span>
        ) : (
          <Link key={href} href={href} aria-label={label} className={className}>
            {inner}
          </Link>
        );
      })}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-200 ring-1 ring-white/20">
              chemisch rekenen · 4 havo / vwo
            </span>
            <AppNav current={current} />
          </div>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
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
