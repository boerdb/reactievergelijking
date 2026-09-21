"use client";

import { useMemo, useState } from "react";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";
import {
  AppPage,
  StepSection,
  btnDark,
  btnGhost,
  inputClass,
} from "@/components/AppShell";
import { tokenizeFormula } from "@/lib/parser";
import { toPlain, toPretty } from "@/lib/mol";
import {
  solveSalt,
  type SaltQtyKind,
  type SaltTarget,
  type SaltStep,
} from "@/lib/salts";

/* ------------------------------------------------------------------ */
/* Voorbeelden                                                         */
/* ------------------------------------------------------------------ */

interface Opgave {
  titel: string;
  vraag: string;
  formula: string;
  givenKind: SaltQtyKind;
  givenRaw: string;
  volumeMlRaw: string;
  want: SaltTarget;
}

const OPGAVEN: Opgave[] = [
  {
    titel: "Cl⁻ in CaCl₂",
    vraag: "Wat is de molariteit van Cl⁻ in 250 mL 0,10 M CaCl₂?",
    formula: "CaCl2",
    givenKind: "molariteit",
    givenRaw: "0,10",
    volumeMlRaw: "250",
    want: "anion",
  },
  {
    titel: "Na⁺ uit Na₂SO₄",
    vraag: "Hoeveel mol Na⁺-ionen zitten er in 5,00 g Na₂SO₄?",
    formula: "Na2SO4",
    givenKind: "gram",
    givenRaw: "5,00",
    volumeMlRaw: "",
    want: "cation",
  },
  {
    titel: "Ionen uit Al₂(SO₄)₃",
    vraag: "0,20 mol Al₂(SO₄)₃ — hoeveel mol van elk ion?",
    formula: "Al2(SO4)3",
    givenKind: "mol",
    givenRaw: "0,20",
    volumeMlRaw: "",
    want: "salt",
  },
  {
    titel: "CuSO₄·5H₂O",
    vraag: "12,5 g blauwe vitriool — hoeveel mol Cu²⁺ komt vrij bij oplossen?",
    formula: "CuSO4.5H2O",
    givenKind: "gram",
    givenRaw: "12,5",
    volumeMlRaw: "",
    want: "cation",
  },
];

const PRESETS = [
  "NaCl",
  "CaCl2",
  "Na2SO4",
  "Ca(OH)2",
  "Al2(SO4)3",
  "(NH4)2SO4",
  "NH4NO3",
  "CuSO4.5H2O",
  "FeCl3",
  "KNO3",
];

/* ------------------------------------------------------------------ */
/* Bouwstenen                                                          */
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

function StepRow({ step, index }: { step: SaltStep; index: number }) {
  const tone =
    step.phase === "ontbinden"
      ? { pill: "bg-slate-700 text-white", label: "ontbinden" }
      : step.phase === "naar"
      ? { pill: "bg-blue-600 text-white", label: "naar mol" }
      : step.phase === "verhouding"
      ? { pill: "bg-indigo-600 text-white", label: "verhouding" }
      : step.phase === "vanuit"
      ? { pill: "bg-amber-600 text-white", label: "vanuit mol" }
      : { pill: "bg-emerald-600 text-white", label: "concentratie" };

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

function WantChip({
  active,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-2 text-left transition ${
        active
          ? "border-indigo-400 bg-indigo-50 text-indigo-900"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <div className="font-serif text-lg leading-none">{label}</div>
      <div className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function ZoutenPage() {
  const [formula, setFormula] = useState("");
  const [givenKind, setGivenKind] = useState<SaltQtyKind>("gram");
  const [givenRaw, setGivenRaw] = useState("");
  const [volumeMlRaw, setVolumeMlRaw] = useState("");
  const [want, setWant] = useState<SaltTarget>("salt");
  const [sig, setSig] = useState(3);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");

  const sol = useMemo(
    () =>
      solveSalt({
        formula,
        givenKind,
        givenRaw,
        volumeMlRaw,
        want,
        sig,
      }),
    [formula, givenKind, givenRaw, volumeMlRaw, want, sig]
  );

  const salt = sol.salt;
  const ready = sol.steps.length > 0 && Number.isFinite(sol.nSalt);

  function onFormule(v: string) {
    setFormula(v);
    setGivenRaw("");
    setVolumeMlRaw("");
    setWant("salt");
  }

  function laadOpgave(o: Opgave) {
    setFormula(o.formula);
    setGivenKind(o.givenKind);
    setGivenRaw(o.givenRaw);
    setVolumeMlRaw(o.volumeMlRaw);
    setWant(o.want);
    window.setTimeout(
      () =>
        document
          .getElementById("uitwerking")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
  }

  function wisAlles() {
    setFormula("");
    setGivenKind("gram");
    setGivenRaw("");
    setVolumeMlRaw("");
    setWant("salt");
  }

  function copyUitwerking() {
    if (sol.steps.length === 0) return;
    const lines = sol.steps.map((st, i) => {
      const filled = st.filled ? `${st.filled} = ` : "";
      return `${i + 1}. ${st.title}\n   ${st.formula}\n   ${filled}${st.answer}\n   ${st.note}`;
    });
    const head = salt?.dissolution ?? formula;
    const text = [head, "", ...lines].join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyState("ok"))
      .catch(() => setCopyState("err"));
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  const kindUnit =
    givenKind === "gram" ? "g" : givenKind === "mol" ? "mol" : "mol/L";

  return (
    <AppPage
      current="/zouten"
      title="Rekenen met"
      titleHighlight="zouten"
      description="Typ een zoutformule — ik splits hem in ionen, schrijf de ontbindingsvergelijking, en reken door naar mol, massa of molariteit van elk ion."
      tips={[
        {
          kicker: "stap 1",
          body: (
            <>
              Zout → <strong>ionen</strong> (ontbinden).
            </>
          ),
        },
        {
          kicker: "stap 2",
          body: (
            <>
              Gegeven → <strong>mol zout</strong>.
            </>
          ),
        },
        {
          kicker: "stap 3",
          body: (
            <>
              × aantal ionen → mol / c van het <strong>ion</strong>.
            </>
          ),
        },
      ]}
    >
      <StepSection
        step={1}
        first
        title="Welk zout?"
        description="Haakjes en kristalwater werken: Ca(OH)₂, Al₂(SO₄)₃, CuSO₄·5H₂O."
      >
        <label htmlFor="salt" className="sr-only">
          Zoutformule
        </label>
        <input
          id="salt"
          type="text"
          value={formula}
          onChange={(e) => onFormule(e.target.value)}
          placeholder="bijv. CaCl2 of Na2SO4"
          className={inputClass}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setKeyboardOpen(true)}
            className={btnDark}
          >
            ⌨ Elementenkiezer
          </button>
          <button type="button" onClick={wisAlles} className={btnGhost}>
            Wissen
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-400">Voorbeelden:</span>
          {PRESETS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormule(f)}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold transition ${
                formula.trim() === f
                  ? "bg-blue-600 text-white"
                  : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {sol.error && (
          <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {sol.error}
          </div>
        )}

        {salt && !sol.error && (
          <div className="mt-4 space-y-3">
            <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-4 font-serif text-xl ring-1 ring-slate-100 sm:text-2xl">
              {salt.dissolution}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  molaire massa
                </div>
                <div className="font-mono font-bold text-slate-800">
                  {toPlain(salt.M)} g/mol
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  kation
                </div>
                <div className="font-serif text-lg font-bold text-emerald-900">
                  {salt.cation.count !== 1 && `${salt.cation.count} `}
                  {salt.cation.pretty}
                </div>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  anion
                </div>
                <div className="font-serif text-lg font-bold text-violet-900">
                  {salt.anion.count !== 1 && `${salt.anion.count} `}
                  {salt.anion.pretty}
                </div>
              </div>
            </div>
          </div>
        )}
      </StepSection>

      <StepSection
        step={2}
        title="Wat weet je van het zout?"
        description="Eén gegeven is genoeg. Bij molariteit hoort een volume."
        headerExtra={
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs font-bold">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSig(n)}
                className={`rounded-md px-2 py-1 transition ${
                  sig === n
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {n} sig
              </button>
            ))}
          </div>
        }
      >
        {!salt ? (
          <p className="text-sm text-slate-500">
            Vul eerst een zoutformule in — dan kun je hier rekenen.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ["gram", "Massa (g)"],
                  ["mol", "Mol zout"],
                  ["molariteit", "Molariteit (mol/L)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGivenKind(id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                    givenKind === id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">
                  {givenKind === "gram"
                    ? `Massa ${salt.pretty}`
                    : givenKind === "mol"
                    ? `Aantal mol ${salt.pretty}`
                    : `Molariteit ${salt.pretty}`}
                </label>
                <div className="relative">
                  <input
                    value={givenRaw}
                    onChange={(e) => setGivenRaw(e.target.value)}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={
                      givenKind === "gram"
                        ? "5,00"
                        : givenKind === "mol"
                        ? "0,20"
                        : "0,10"
                    }
                    className="w-full rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 pr-16 text-lg font-bold tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {kindUnit}
                  </span>
                </div>
              </div>

              {(givenKind === "molariteit" || volumeMlRaw !== "") && (
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Volume oplossing
                  </label>
                  <div className="relative">
                    <input
                      value={volumeMlRaw}
                      onChange={(e) => setVolumeMlRaw(e.target.value)}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="250"
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 pr-14 text-lg font-bold tabular-nums focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      mL
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Nodig voor molariteit van de ionen. Optioneel bij gram/mol.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </StepSection>

      <StepSection
        step={3}
        title="Wat wil je weten?"
        description="Kies een ion — of het overzicht van beide."
      >
        {!salt ? (
          <p className="text-sm text-slate-500">Eerst een zoutformule.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <WantChip
              active={want === "salt"}
              label="Beide ionen"
              sub="overzicht"
              onClick={() => setWant("salt")}
            />
            <WantChip
              active={want === "cation"}
              label={salt.cation.pretty}
              sub={salt.cation.name}
              onClick={() => setWant("cation")}
            />
            <WantChip
              active={want === "anion"}
              label={salt.anion.pretty}
              sub={salt.anion.name}
              onClick={() => setWant("anion")}
            />
          </div>
        )}
      </StepSection>

      {ready && salt && sol.cation && sol.anion && (
        <StepSection title="De route">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Deeltje</th>
                  <th className="py-2 pr-3 text-right font-semibold">aantal</th>
                  <th className="py-2 pr-3 text-right font-semibold">M (g/mol)</th>
                  <th className="py-2 pr-3 text-right font-semibold">n (mol)</th>
                  <th className="py-2 pr-3 text-right font-semibold">m (g)</th>
                  <th className="py-2 pr-3 text-right font-semibold">c (mol/L)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="py-2 pr-3 font-serif text-base">
                    <FormulaView formula={salt.anhydrous} />
                    {salt.hydrateWater > 0 && (
                      <span>
                        ·{salt.hydrateWater === 1 ? "" : salt.hydrateWater}H<sub>2</sub>O
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">1</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{toPlain(salt.M)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.nSalt, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.mSalt, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {sol.cSalt != null ? toPretty(sol.cSalt, sig) : "—"}
                  </td>
                </tr>
                <tr
                  className={`border-b border-slate-100 ${
                    want === "cation" ? "bg-indigo-50" : "bg-emerald-50/50"
                  }`}
                >
                  <td className="py-2 pr-3 font-serif text-base">{salt.cation.pretty}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{salt.cation.count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {toPlain(salt.cation.M)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.cation.n, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.cation.m, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {sol.cation.c != null ? toPretty(sol.cation.c, sig) : "—"}
                  </td>
                </tr>
                <tr
                  className={`border-b border-slate-100 ${
                    want === "anion" ? "bg-indigo-50" : "bg-violet-50/50"
                  }`}
                >
                  <td className="py-2 pr-3 font-serif text-base">{salt.anion.pretty}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{salt.anion.count}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {toPlain(salt.anion.M)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.anion.n, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {toPretty(sol.anion.m, sig)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {sol.anion.c != null ? toPretty(sol.anion.c, sig) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </StepSection>
      )}

      <StepSection
        id="uitwerking"
        step={4}
        title="Zo schrijf je het op"
        description="Formule, ingevulde getallen, antwoord — zoals in je schrift."
        headerExtra={
          ready ? (
            <button type="button" onClick={copyUitwerking} className={btnDark}>
              {copyState === "ok"
                ? "Gekopieerd"
                : copyState === "err"
                ? "Kopiëren mislukt"
                : "Kopieer uitwerking"}
            </button>
          ) : undefined
        }
      >
        {!ready ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
            <p className="text-3xl" aria-hidden>
              🧂
            </p>
            <p className="mt-2 font-bold text-slate-600">Nog niet compleet.</p>
            <p className="text-sm text-slate-500">
              Vul een zoutformule in en één gegeven (massa, mol of molariteit).
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {sol.steps.map((s, i) => (
              <StepRow key={s.id} step={s} index={i + 1} />
            ))}
          </ol>
        )}

        {ready && (
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-teal-600 to-blue-800 p-5 text-white shadow-lg">
            <div className="text-xs font-bold uppercase tracking-widest text-teal-100">
              antwoord
            </div>
            <p className="mt-1 font-serif text-2xl font-black sm:text-3xl">
              {sol.wantAnswer}
            </p>
            <p className="mt-1 text-sm text-teal-100">{sol.wantLabel}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={wisAlles} className={btnGhost}>
            Wis alles
          </button>
          <span className="text-sm text-slate-400">of pak een opgave:</span>
          {OPGAVEN.map((o) => (
            <button
              key={o.titel}
              type="button"
              onClick={() => laadOpgave(o)}
              title={o.vraag}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              {o.titel}
            </button>
          ))}
        </div>
      </StepSection>

      <StepSection
        title="Spiekbrief"
        description="Zouten ontbinden eerst; daarna is het dezelfde mol-route als in het rekenschema."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["zout → ionen", "schrijf de ontbindingsvergelijking"],
            ["n = m ÷ M", "massa zout → mol zout"],
            ["n(ion) = n(zout) × aantal", "factor uit de vergelijking"],
            ["c(ion) = c(zout) × aantal", "zelfde volume, andere molariteit"],
          ].map(([f, uitleg]) => (
            <div
              key={f}
              className="rounded-xl border-l-4 border-teal-500 bg-teal-50 p-3"
            >
              <div className="font-mono text-base font-black text-slate-800">{f}</div>
              <div className="text-xs text-slate-600">{uitleg}</div>
            </div>
          ))}
        </div>
      </StepSection>

      <PeriodicKeyboardModal
        open={keyboardOpen}
        initial={formula}
        onClose={() => setKeyboardOpen(false)}
        onSave={(v) => onFormule(v)}
      />
    </AppPage>
  );
}
