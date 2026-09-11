"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";
import {
  tokenizeFormula,
  equationToUnicode,
  toUnicodeSubscript,
} from "@/lib/parser";
import { toPlain, toPretty } from "@/lib/mol";
import {
  solveStoich,
  listSpecies,
  type QtyKind,
  type Species,
  type StoichStep,
} from "@/lib/stoich";

/* ------------------------------------------------------------------ */
/* Voorbeelden                                                         */
/* ------------------------------------------------------------------ */

interface Opgave {
  titel: string;
  vraag: string;
  equation: string;
  givenId: string;
  givenKind: QtyKind;
  givenRaw: string;
  wantId: string;
  mixtureRaw: string;
}

const OPGAVEN: Opgave[] = [
  {
    titel: "KCl in mengsel",
    vraag:
      "6,13 g mengsel MgO + KCl. Het KCl wordt omgezet; er komt 0,862 g Cl₂ vrij. Wat is het massapercentage KCl?",
    equation: "2 KCl -> 2 K + Cl2",
    givenId: "R1",
    givenKind: "gram",
    givenRaw: "0,862",
    wantId: "L0",
    mixtureRaw: "6,13",
  },
  {
    titel: "Water uit zuurstof",
    vraag: "Hoeveel gram water ontstaat uit 16 g O₂?",
    equation: "2 H2 + O2 -> 2 H2O",
    givenId: "L1",
    givenKind: "gram",
    givenRaw: "16",
    wantId: "R0",
    mixtureRaw: "",
  },
  {
    titel: "CO₂ uit kalk",
    vraag: "Hoeveel gram CO₂ komt vrij als 10,0 g CaCO₃ volledig ontleedt?",
    equation: "CaCO3 -> CaO + CO2",
    givenId: "L0",
    givenKind: "gram",
    givenRaw: "10,0",
    wantId: "R1",
    mixtureRaw: "",
  },
];

const EQ_EXAMPLES = [
  "2 KCl -> 2 K + Cl2",
  "2 H2 + O2 -> 2 H2O",
  "CaCO3 -> CaO + CO2",
  "N2 + 3 H2 -> 2 NH3",
  "2 NaCl -> 2 Na + Cl2",
];

/* ------------------------------------------------------------------ */
/* Kleine bouwstenen                                                   */
/* ------------------------------------------------------------------ */

function FormulaView({ formula }: { formula: string }) {
  const pieces = useMemo(() => tokenizeFormula(formula), [formula]);
  return (
    <>
      {pieces.map((p, i) =>
        p.type === "sub" ? <sub key={i}>{p.value}</sub> : <span key={i}>{p.value}</span>
      )}
    </>
  );
}

function CoefFormula({ s }: { s: Species }) {
  return (
    <span className="font-serif">
      {s.coefficient !== 1 && (
        <span className="font-semibold">{s.coefficient} </span>
      )}
      <FormulaView formula={s.formula} />
    </span>
  );
}

function StepRow({ step, index }: { step: StoichStep; index: number }) {
  const tone =
    step.phase === "naar"
      ? { pill: "bg-blue-600 text-white", label: "naar mol" }
      : step.phase === "verhouding"
      ? { pill: "bg-indigo-600 text-white", label: "molverhouding" }
      : step.phase === "vanuit"
      ? { pill: "bg-amber-600 text-white", label: "vanuit mol" }
      : { pill: "bg-rose-500 text-white", label: "mengsel" };

  return (
    <li className="relative pl-10">
      <span className="absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-black text-slate-700 ring-2 ring-slate-200">
        {index}
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone.pill}`}
          >
            {tone.label}
          </span>
          <span className="text-sm font-bold text-slate-800">{step.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
            {step.formula}
          </span>
          {step.filled && (
            <>
              <span className="text-slate-300">→</span>
              <span className="text-slate-600">{step.filled}</span>
            </>
          )}
          <span className="text-slate-300">=</span>
          <span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">
            {step.answer}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{step.note}</p>
      </div>
    </li>
  );
}

function SpeciesChip({
  s,
  active,
  role,
  onClick,
}: {
  s: Species;
  active: boolean;
  role: "given" | "want" | "none";
  onClick: () => void;
}) {
  const ring =
    role === "given"
      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
      : role === "want"
      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
      : active
      ? "border-slate-400 bg-slate-100 text-slate-900"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-2 text-left transition ${ring}`}
    >
      <div className="text-lg leading-none">
        <CoefFormula s={s} />
      </div>
      <div className="mt-1 text-[11px] font-semibold text-slate-500">
        M = {toPlain(s.M)} g/mol
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function MolverhoudingPage() {
  const [equation, setEquation] = useState("");
  const [givenId, setGivenId] = useState<string | null>(null);
  const [givenKind, setGivenKind] = useState<QtyKind>("gram");
  const [givenRaw, setGivenRaw] = useState("");
  const [wantId, setWantId] = useState<string | null>(null);
  const [mixtureRaw, setMixtureRaw] = useState("");
  const [sig, setSig] = useState(3);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  const preview = useMemo(() => {
    const eq = equation.trim();
    if (!eq) return { error: null as string | null, species: [] as Species[], unicode: "" };
    try {
      const sol = solveStoich({
        equation: eq,
        givenId: null,
        givenKind: "gram",
        givenRaw: "",
        wantId: null,
        mixtureRaw: "",
        sig,
      });
      if (sol.error) return { error: sol.error, species: [] as Species[], unicode: "" };
      return {
        error: null,
        species: sol.species.length ? sol.species : listSpecies(sol.parsed!),
        unicode: sol.parsed ? equationToUnicode(sol.parsed) : "",
        balanced: sol.balanced,
        warn: sol.warn,
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Onleesbare vergelijking.",
        species: [] as Species[],
        unicode: "",
      };
    }
  }, [equation, sig]);

  const sol = useMemo(
    () =>
      solveStoich({
        equation,
        givenId,
        givenKind,
        givenRaw,
        wantId,
        mixtureRaw,
        sig,
      }),
    [equation, givenId, givenKind, givenRaw, wantId, mixtureRaw, sig]
  );

  const left = preview.species.filter((s) => s.side === "left");
  const right = preview.species.filter((s) => s.side === "right");

  function onEquation(v: string) {
    setEquation(v);
    setGivenId(null);
    setWantId(null);
    setGivenRaw("");
    setMixtureRaw("");
  }

  function kiesGiven(id: string) {
    setGivenId(id);
    if (wantId === id) setWantId(null);
  }

  function kiesWant(id: string) {
    setWantId(id);
  }

  function laadOpgave(o: Opgave) {
    setEquation(o.equation);
    setGivenId(o.givenId);
    setGivenKind(o.givenKind);
    setGivenRaw(o.givenRaw);
    setWantId(o.wantId);
    setMixtureRaw(o.mixtureRaw);
    window.setTimeout(
      () =>
        document
          .getElementById("uitwerking")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
  }

  function wisAlles() {
    setEquation("");
    setGivenId(null);
    setGivenKind("gram");
    setGivenRaw("");
    setWantId(null);
    setMixtureRaw("");
  }

  function copyUitwerking() {
    if (sol.steps.length === 0) return;
    const lines = sol.steps.map((st, i) => {
      const filled = st.filled ? `${st.filled} = ` : "";
      return `${i + 1}. ${st.title}\n   ${st.formula}\n   ${filled}${st.answer}\n   ${st.note}`;
    });
    const head = sol.parsed ? equationToUnicode(sol.parsed) : equation;
    const text = [head, "", ...lines].join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyState("ok"))
      .catch(() => setCopyState("err"));
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  const given = sol.given ?? preview.species.find((s) => s.id === givenId) ?? null;
  const want = sol.want ?? preview.species.find((s) => s.id === wantId) ?? null;
  const ready = sol.steps.length > 0;

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white">
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
          <nav className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="text-blue-200 hover:text-white">
              ← Vergelijkingen
            </Link>
            <Link href="/bereken" className="text-blue-200 hover:text-white">
              Molecuulmassa
            </Link>
            <Link href="/rekenschema" className="text-blue-200 hover:text-white">
              Rekenschema
            </Link>
            <span className="font-semibold text-white">Molverhouding</span>
          </nav>

          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-200 ring-1 ring-white/20">
            chemisch rekenen · 4 havo / vwo
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Van stof A naar stof B via{" "}
            <span className="bg-gradient-to-r from-sky-300 to-violet-300 bg-clip-text text-transparent">
              mol
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-blue-100">
            Vul de reactie in, geef de massa (of mol) van één stof, en kies wat
            je zoekt. Optioneel: de massa van het mengsel — dan volgt het
            massapercentage.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                stap 1
              </div>
              <p className="mt-1 text-sm">
                Gegeven → <strong>mol</strong> (delen door M).
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                stap 2
              </div>
              <p className="mt-1 text-sm">
                Molverhouding uit de <strong>coëfficiënten</strong>.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                stap 3
              </div>
              <p className="mt-1 text-sm">
                Mol → massa, en zo nodig <strong>mass%</strong> in het mengsel.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ---------------- stap 1 ---------------- */}
        <section className="-mt-6 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
              1
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Welke reactie hoort bij de opgave?
              </h2>
              <p className="text-sm text-slate-500">
                Alleen de stoffen die meedoen. Een andere stof in het mengsel
                laat je weg.
              </p>
            </div>
          </div>

          <input
            value={equation}
            onChange={(e) => onEquation(e.target.value)}
            placeholder="bijv. 2 KCl -> 2 K + Cl2"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-lg font-bold focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 sm:text-xl"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKeyboardOpen(true)}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-900"
            >
              ⌨ Elementenkiezer
            </button>
            {EQ_EXAMPLES.map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => onEquation(eq)}
                className={`rounded-lg px-2.5 py-2 font-mono text-xs font-semibold transition sm:text-sm ${
                  equation.trim() === eq
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {eq}
              </button>
            ))}
          </div>

          {preview.error && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {preview.error}
            </div>
          )}

          {!preview.error && preview.species.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-serif text-xl text-slate-800">
                  {preview.unicode}
                </p>
                {"balanced" in preview && preview.balanced ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    kloppend
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800">
                    niet kloppend
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ---------------- stap 2 ---------------- */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                2
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Wat weet je, wat zoek je?
                </h2>
                <p className="text-sm text-slate-500">
                  Groen = gegeven uit de opgave. Paars = wat je moet berekenen.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                significante cijfers
              </span>
              <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-200">
                {[2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSig(s)}
                    className={`px-2.5 py-1 text-sm font-bold transition ${
                      sig === s
                        ? "bg-slate-800 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {preview.species.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="font-bold text-slate-600">Eerst een vergelijking.</p>
              <p className="text-sm text-slate-500">
                Typ hem hierboven of pak een voorbeeld.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-700">
                  Gegeven stof
                </h3>
                <div className="mb-3 flex flex-wrap gap-2">
                  {left.length > 0 && (
                    <span className="self-center text-[10px] font-bold uppercase text-slate-400">
                      links
                    </span>
                  )}
                  {left.map((s) => (
                    <SpeciesChip
                      key={s.id}
                      s={s}
                      active={false}
                      role={givenId === s.id ? "given" : "none"}
                      onClick={() => kiesGiven(s.id)}
                    />
                  ))}
                  {right.length > 0 && (
                    <span className="self-center text-[10px] font-bold uppercase text-slate-400">
                      rechts
                    </span>
                  )}
                  {right.map((s) => (
                    <SpeciesChip
                      key={s.id}
                      s={s}
                      active={false}
                      role={givenId === s.id ? "given" : "none"}
                      onClick={() => kiesGiven(s.id)}
                    />
                  ))}
                </div>

                <div className="flex gap-1">
                  {(["gram", "mol"] as QtyKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setGivenKind(k)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                        givenKind === k
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {k === "gram" ? "massa (g)" : "mol"}
                    </button>
                  ))}
                </div>
                <div className="relative mt-2">
                  <input
                    value={givenRaw}
                    onChange={(e) => setGivenRaw(e.target.value)}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={givenKind === "gram" ? "0,862" : "0,012"}
                    aria-label={givenKind === "gram" ? "Massa in gram" : "Aantal mol"}
                    className="w-full rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 pr-14 text-lg font-bold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {givenKind === "gram" ? "g" : "mol"}
                  </span>
                </div>
                {given && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Je geeft{" "}
                    <span className="font-serif font-semibold text-slate-700">
                      <FormulaView formula={given.formula} />
                    </span>{" "}
                    · M = {toPlain(given.M)} g/mol
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-indigo-700">
                  Gevraagde stof
                </h3>
                <div className="flex flex-wrap gap-2">
                  {preview.species.map((s) => (
                    <SpeciesChip
                      key={`w-${s.id}`}
                      s={s}
                      active={false}
                      role={wantId === s.id ? "want" : "none"}
                      onClick={() => kiesWant(s.id)}
                    />
                  ))}
                </div>
                {want && (
                  <p className="mt-3 text-xs text-slate-500">
                    Je zoekt{" "}
                    <span className="font-serif font-semibold text-slate-700">
                      <FormulaView formula={want.formula} />
                    </span>{" "}
                    · M = {toPlain(want.M)} g/mol
                  </p>
                )}
                {given && want && given.id !== want.id && (
                  <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">
                    {given.coefficient} {toUnicodeSubscript(given.formula)} :{" "}
                    {want.coefficient} {toUnicodeSubscript(want.formula)}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ---------------- stap 3 mengsel ---------------- */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
              3
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Zit de stof in een mengsel?
              </h2>
              <p className="text-sm text-slate-500">
                Optioneel. Vul de totale massa van het mengsel in voor het
                massapercentage van de gevraagde stof.
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Massa mengsel
            </label>
            <div className="relative">
              <input
                value={mixtureRaw}
                onChange={(e) => setMixtureRaw(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="bijv. 6,13"
                aria-label="Massa van het mengsel in gram"
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 pr-14 text-lg font-bold tabular-nums focus:border-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-400/20"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                g
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Laat leeg als de opgave geen mengsel is. De andere component
              (bijv. MgO) hoeft niet in de reactie.
            </p>
          </div>
        </section>

        {/* ---------------- route ---------------- */}
        {ready && given && want && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-black text-slate-900">De route</h2>
            <div className="flex flex-wrap items-stretch gap-2">
              <RouteBox
                tone="emerald"
                kicker="gegeven"
                title={
                  givenKind === "gram"
                    ? `m(${toUnicodeSubscript(given.formula)})`
                    : `n(${toUnicodeSubscript(given.formula)})`
                }
                value={
                  givenKind === "gram"
                    ? `${toPretty(sol.mGiven, sig)} g`
                    : `${toPretty(sol.nGiven, sig)} mol`
                }
              />
              <Arrow label="÷ M" />
              <RouteBox
                tone="blue"
                kicker="mol"
                title={`n(${toUnicodeSubscript(given.formula)})`}
                value={`${toPretty(sol.nGiven, sig)} mol`}
              />
              {given.id !== want.id && (
                <>
                  <Arrow label={`× ${want.coefficient}/${given.coefficient}`} />
                  <RouteBox
                    tone="indigo"
                    kicker="verhouding"
                    title={`n(${toUnicodeSubscript(want.formula)})`}
                    value={`${toPretty(sol.nWant, sig)} mol`}
                  />
                </>
              )}
              <Arrow label="× M" />
              <RouteBox
                tone="amber"
                kicker="gevraagd"
                title={`m(${toUnicodeSubscript(want.formula)})`}
                value={`${toPretty(sol.mWant, sig)} g`}
              />
              {sol.massPct !== null && (
                <>
                  <Arrow label="÷ mengsel" />
                  <RouteBox
                    tone="rose"
                    kicker="massapercentage"
                    title={`% ${toUnicodeSubscript(want.formula)}`}
                    value={`${toPretty(sol.massPct, sig)}%`}
                    big
                  />
                </>
              )}
            </div>

            {sol.values.length > 1 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-3 font-semibold">Stof</th>
                      <th className="py-2 pr-3 text-right font-semibold">M (g/mol)</th>
                      <th className="py-2 pr-3 text-right font-semibold">n (mol)</th>
                      <th className="py-2 pr-3 text-right font-semibold">m (g)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sol.species.map((s) => {
                      const v = sol.values.find((x) => x.id === s.id);
                      const hl =
                        s.id === want.id
                          ? "bg-indigo-50"
                          : s.id === given.id
                          ? "bg-emerald-50"
                          : "";
                      return (
                        <tr key={s.id} className={`border-b border-slate-100 ${hl}`}>
                          <td className="py-2 pr-3 font-serif text-base">
                            <CoefFormula s={s} />
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {toPlain(s.M)}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                            {v ? toPretty(v.n, sig) : "—"}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                            {v ? toPretty(v.m, sig) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ---------------- uitwerking ---------------- */}
        <section
          id="uitwerking"
          className="mt-5 scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                4
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Zo schrijf je het op
                </h2>
                <p className="text-sm text-slate-500">
                  Formule, ingevulde getallen, antwoord — zoals in je schrift.
                </p>
              </div>
            </div>
            {ready && (
              <button
                type="button"
                onClick={copyUitwerking}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white hover:bg-slate-900"
              >
                {copyState === "ok"
                  ? "Gekopieerd"
                  : copyState === "err"
                  ? "Kopiëren mislukt"
                  : "Kopieer uitwerking"}
              </button>
            )}
          </div>

          {sol.warn && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {sol.warn}
            </div>
          )}

          {!ready ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="text-3xl" aria-hidden>
                ⚗️
              </p>
              <p className="mt-2 font-bold text-slate-600">Nog niet compleet.</p>
              <p className="text-sm text-slate-500">
                Kies een gegeven stof én een gevraagde stof, en vul een getal in.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {sol.steps.map((s, i) => (
                <StepRow key={s.id} step={s} index={i + 1} />
              ))}
            </ol>
          )}

          {ready && sol.massPct !== null && want && (
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-rose-600 to-indigo-700 p-5 text-white shadow-lg">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-100">
                antwoord
              </div>
              <p className="mt-1 font-serif text-3xl font-black">
                {toPretty(sol.massPct, sig)}%{" "}
                <span className="text-xl font-semibold text-rose-100">
                  <FormulaView formula={want.formula} />
                </span>
              </p>
              <p className="mt-1 text-sm text-rose-100">
                {toPretty(sol.mWant, sig)} g in {toPlain(sol.mixture)} g mengsel
              </p>
            </div>
          )}

          {ready && sol.massPct === null && want && (
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white shadow-lg">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-100">
                antwoord
              </div>
              <p className="mt-1 font-serif text-3xl font-black">
                {toPretty(sol.mWant, sig)} g{" "}
                <span className="text-xl font-semibold text-indigo-100">
                  <FormulaView formula={want.formula} />
                </span>
              </p>
              <p className="mt-1 text-sm text-indigo-100">
                {toPretty(sol.nWant, sig)} mol
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={wisAlles}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Wis alles
            </button>
            <span className="text-sm text-slate-400">of pak een opgave:</span>
            {OPGAVEN.map((o) => (
              <button
                key={o.titel}
                type="button"
                onClick={() => laadOpgave(o)}
                title={o.vraag}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                {o.titel}
              </button>
            ))}
          </div>
        </section>

        {/* ---------------- spiekbrief ---------------- */}
        <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-black text-slate-900">Spiekbrief</h2>
          <p className="mb-4 text-sm text-slate-500">
            Dezelfde gouden regel als in het rekenschema: naar mol toe delen,
            van mol af vermenigvuldigen.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["n = m ÷ M", "gegeven massa → mol"],
              ["a A : b B", "n(B) = n(A) × b/a"],
              ["m = n × M", "mol van de gevraagde stof → massa"],
              ["mass% = m / m_tot × 100%", "alleen bij een mengsel"],
            ].map(([f, uitleg]) => (
              <div key={f} className="rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-3">
                <div className="font-mono text-base font-black text-slate-800">{f}</div>
                <div className="text-xs text-slate-600">{uitleg}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <PeriodicKeyboardModal
        open={keyboardOpen}
        initial={equation}
        onClose={() => setKeyboardOpen(false)}
        onSave={(v) => onEquation(v)}
      />
    </main>
  );
}

function RouteBox({
  tone,
  kicker,
  title,
  value,
  big,
}: {
  tone: "emerald" | "blue" | "indigo" | "amber" | "rose";
  kicker: string;
  title: string;
  value: string;
  big?: boolean;
}) {
  const skin = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];
  const kick = {
    emerald: "text-emerald-600",
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    amber: "text-amber-700",
    rose: "text-rose-600",
  }[tone];

  return (
    <div className={`min-w-[7.5rem] flex-1 rounded-xl border-2 px-3 py-2 ${skin}`}>
      <div className={`text-[10px] font-black uppercase tracking-wider ${kick}`}>
        {kicker}
      </div>
      <div className="text-xs font-semibold opacity-80">{title}</div>
      <div className={`font-black tabular-nums ${big ? "text-xl" : "text-base"}`}>
        {value}
      </div>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex min-w-[3.5rem] flex-col items-center justify-center px-1 text-center">
      <span className="text-[10px] font-black text-slate-500">{label}</span>
      <span className="text-lg leading-none text-slate-300" aria-hidden>
        →
      </span>
    </div>
  );
}
