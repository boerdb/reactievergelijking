"use client";

import { useMemo, useState } from "react";
import { calculate } from "@/lib/calc";
import { AppPage, StepSection } from "@/components/AppShell";
import { tokenizeFormula } from "@/lib/parser";
import {
  solve,
  parseNL,
  toPlain,
  Q,
  PARAM,
  NA_PRETTY,
  type FId,
  type ParamId,
  type Missing,
  type Step,
} from "@/lib/mol";

/* ------------------------------------------------------------------ */
/* Vormgeving per grootheid                                            */
/* ------------------------------------------------------------------ */

interface Skin {
  dot: string;
  text: string;
  soft: string;
  border: string;
  line: string;
}

const SKIN: Record<FId, Skin> = {
  mol: {
    dot: "bg-white",
    text: "text-white",
    soft: "bg-blue-600",
    border: "border-blue-700",
    line: "#2563eb",
  },
  gram: {
    dot: "bg-amber-400",
    text: "text-amber-700",
    soft: "bg-amber-50",
    border: "border-amber-200",
    line: "#f59e0b",
  },
  deeltjes: {
    dot: "bg-violet-400",
    text: "text-violet-700",
    soft: "bg-violet-50",
    border: "border-violet-200",
    line: "#8b5cf6",
  },
  gasvolume: {
    dot: "bg-sky-400",
    text: "text-sky-700",
    soft: "bg-sky-50",
    border: "border-sky-200",
    line: "#0ea5e9",
  },
  molariteit: {
    dot: "bg-emerald-400",
    text: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    line: "#10b981",
  },
  volume: {
    dot: "bg-rose-400",
    text: "text-rose-700",
    soft: "bg-rose-50",
    border: "border-rose-200",
    line: "#f43f5e",
  },
};

const SHORT_UNIT: Record<FId, string> = {
  mol: "mol",
  gram: "g",
  deeltjes: "",
  gasvolume: "dm³",
  molariteit: "mol/L",
  volume: "mL",
};

const PLACEHOLDER: Record<FId, string> = {
  mol: "0,50",
  gram: "36",
  deeltjes: "6,022 × 10²³",
  gasvolume: "11,2",
  molariteit: "0,10",
  volume: "25",
};

/* posities in het schema, in procenten van het tekenvlak */
const POS: Record<FId, { x: number; y: number }> = {
  gasvolume: { x: 50, y: 10 },
  gram: { x: 16, y: 42 },
  mol: { x: 50, y: 42 },
  deeltjes: { x: 84, y: 42 },
  volume: { x: 16, y: 82 },
  molariteit: { x: 50, y: 82 },
};

const EDGES: { key: FId; a: FId; b: FId }[] = [
  { key: "gram", a: "gram", b: "mol" },
  { key: "deeltjes", a: "mol", b: "deeltjes" },
  { key: "gasvolume", a: "gasvolume", b: "mol" },
  { key: "molariteit", a: "mol", b: "molariteit" },
  { key: "volume", a: "gram", b: "volume" },
];

const CHIPS: {
  key: FId;
  dir: "naar" | "vanuit";
  x: number;
  y: number;
  text: string;
}[] = [
  { key: "gram", dir: "naar", x: 33, y: 36, text: "÷ M →" },
  { key: "gram", dir: "vanuit", x: 33, y: 48, text: "← × M" },
  { key: "deeltjes", dir: "naar", x: 67, y: 36, text: "← ÷ Nₐ" },
  { key: "deeltjes", dir: "vanuit", x: 67, y: 48, text: "× Nₐ →" },
  { key: "gasvolume", dir: "naar", x: 38, y: 25, text: "÷ Vₘ ↓" },
  { key: "gasvolume", dir: "vanuit", x: 62, y: 25, text: "↑ × Vₘ" },
  { key: "molariteit", dir: "naar", x: 37, y: 61, text: "× V ↑" },
  { key: "molariteit", dir: "vanuit", x: 63, y: 61, text: "↓ ÷ V" },
  { key: "volume", dir: "naar", x: 32, y: 57, text: "× ρ ↑" },
  { key: "volume", dir: "vanuit", x: 32, y: 66, text: "↓ ÷ ρ" },
];

const STEP_TO_CHIP: Record<string, string> = {
  "gram>mol": "gram:naar",
  "mol>gram": "gram:vanuit",
  "deeltjes>mol": "deeltjes:naar",
  "mol>deeltjes": "deeltjes:vanuit",
  "gasvolume>mol": "gasvolume:naar",
  "mol>gasvolume": "gasvolume:vanuit",
  "molariteit>mol": "molariteit:naar",
  "mol>molariteit": "molariteit:vanuit",
  "volume>gram": "volume:naar",
  "gram>volume": "volume:vanuit",
};

/* ------------------------------------------------------------------ */
/* Stoffen en voorbeeldopgaven                                         */
/* ------------------------------------------------------------------ */

const PRESETS: { f: string; naam: string; rho?: string }[] = [
  { f: "H2O", naam: "water", rho: "1,00" },
  { f: "O2", naam: "zuurstof" },
  { f: "CO2", naam: "koolstofdioxide" },
  { f: "N2", naam: "stikstof" },
  { f: "CH4", naam: "methaan" },
  { f: "NH3", naam: "ammoniak" },
  { f: "HCl", naam: "waterstofchloride" },
  { f: "NaCl", naam: "keukenzout" },
  { f: "NaOH", naam: "natriumhydroxide" },
  { f: "H2SO4", naam: "zwavelzuur", rho: "1,83" },
  { f: "C6H12O6", naam: "glucose" },
  { f: "C2H6O", naam: "ethanol", rho: "0,789" },
  { f: "CaCO3", naam: "calciumcarbonaat" },
  { f: "Fe", naam: "ijzer", rho: "7,87" },
];

interface Opgave {
  titel: string;
  vraag: string;
  formule: string;
  rho: string;
  vopl: string;
  source: FId;
  raw: string;
}

const OPGAVEN: Opgave[] = [
  {
    titel: "36 g water",
    vraag: "Hoeveel mol, hoeveel moleculen en hoeveel mL is dat?",
    formule: "H2O",
    rho: "1,00",
    vopl: "",
    source: "gram",
    raw: "36",
  },
  {
    titel: "11,2 dm³ zuurstof",
    vraag: "Een gasvolume bij 0 °C omrekenen naar massa.",
    formule: "O2",
    rho: "",
    vopl: "",
    source: "gasvolume",
    raw: "11,2",
  },
  {
    titel: "250 mL 0,10 M zoutzuur",
    vraag: "Van concentratie naar het aantal gram opgeloste stof.",
    formule: "HCl",
    rho: "",
    vopl: "250",
    source: "molariteit",
    raw: "0,10",
  },
  {
    titel: "6,022 × 10²³ deeltjes glucose",
    vraag: "Precies één mol — wat weegt dat?",
    formule: "C6H12O6",
    rho: "",
    vopl: "",
    source: "deeltjes",
    raw: "6,022 × 10²³",
  },
  {
    titel: "25 mL ethanol",
    vraag: "Eerst via de dichtheid naar massa, dan pas naar mol.",
    formule: "C2H6O",
    rho: "0,789",
    vopl: "",
    source: "volume",
    raw: "25",
  },
  {
    titel: "Glucose in bloed",
    vraag: "In 6 mL bloed zit 5×10⁻⁵ mol glucose. Wat is de molariteit?",
    formule: "C6H12O6",
    rho: "",
    vopl: "6",
    source: "mol",
    raw: "5 × 10⁻⁵",
  },
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

function focusParam(id: ParamId) {
  const el = document.getElementById(`param-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => el.focus(), 320);
}

interface NodeProps {
  id: FId;
  value: string;
  pretty?: string;
  isSource: boolean;
  computed: boolean;
  blocked?: Missing;
  hub?: boolean;
  onChange: (id: FId, v: string) => void;
  /** Bij molariteit: volume van de oplossing hoort erbij (c = n / V). */
  vopl?: string;
  onVopl?: (v: string) => void;
  voplNodig?: boolean;
}

function NodeCard({
  id,
  value,
  pretty,
  isSource,
  computed,
  blocked,
  hub,
  onChange,
  vopl,
  onVopl,
  voplNodig,
}: NodeProps) {
  const meta = Q[id];
  const skin = SKIN[id];
  const unit = SHORT_UNIT[id];

  const shell = hub
    ? "relative rounded-2xl border-2 border-blue-800/40 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 p-3.5 text-white shadow-xl shadow-blue-600/30"
    : `relative rounded-2xl border-2 bg-white p-3.5 shadow-sm transition ${
        isSource
          ? "border-emerald-400 shadow-emerald-100"
          : computed
          ? skin.border
          : "border-slate-200"
      }`;

  const inputRing = isSource
    ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20"
    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20";

  return (
    <div className={shell}>
      {isSource && (
        <span className="absolute -top-2.5 left-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
          jouw gegeven
        </span>
      )}
      {!isSource && computed && (
        <span
          className={`absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
            hub ? "bg-white text-blue-700" : `${skin.soft} ${skin.text}`
          }`}
        >
          berekend
        </span>
      )}

      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${skin.dot}`}
            aria-hidden
          />
          <h3
            className={`text-sm font-extrabold leading-none ${
              hub ? "text-white" : "text-slate-800"
            }`}
          >
            {meta.label}
          </h3>
        </div>
        <span
          className={`font-serif text-base italic leading-none ${
            hub ? "text-blue-100" : "text-slate-400"
          }`}
        >
          {meta.symbol}
        </span>
      </div>

      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(id, e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={PLACEHOLDER[id]}
          aria-label={`${meta.label} in ${meta.unit}`}
          className={`w-full rounded-xl border-2 bg-white px-3 py-2 font-bold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-300 focus:outline-none focus:ring-4 ${inputRing} ${
            unit ? "pr-14" : ""
          } ${value.length > 12 ? "text-base" : "text-lg"}`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {id === "molariteit" && onVopl && (
        <div className="mt-2">
          <label
            htmlFor="node-vopl"
            className={`mb-1 block text-[10px] font-bold uppercase tracking-wide ${
              voplNodig ? "text-amber-600" : "text-slate-500"
            }`}
          >
            Volume oplossing (mL)
          </label>
          <div className="relative">
            <input
              id="node-vopl"
              value={vopl ?? ""}
              onChange={(e) => onVopl(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="bijv. 6"
              aria-label="Volume van de oplossing in milliliter"
              className={`w-full rounded-lg border-2 bg-white px-2.5 py-1.5 pr-10 text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-4 ${
                voplNodig
                  ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                  : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
              }`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
              mL
            </span>
          </div>
          {voplNodig && (
            <p className="mt-1 text-[10px] font-semibold text-amber-700">
              Nodig voor c = n ÷ V (V in liter)
            </p>
          )}
        </div>
      )}

      <div className="mt-1.5 min-h-[1.15rem] text-[11px] leading-tight">
        {blocked && id !== "molariteit" ? (
          <button
            onClick={() => focusParam(blocked.param)}
            className="font-semibold text-slate-500 underline decoration-dotted underline-offset-2 hover:text-blue-600"
          >
            + {blocked.text}
          </button>
        ) : computed && pretty ? (
          <span className={hub ? "font-semibold text-blue-100" : "text-slate-500"}>
            = {pretty}
          </span>
        ) : id === "molariteit" && !voplNodig ? (
          <span className="text-slate-400">{meta.hint}</span>
        ) : id !== "molariteit" ? (
          <span className={hub ? "text-blue-200" : "text-slate-400"}>{meta.hint}</span>
        ) : null}
      </div>
    </div>
  );
}

function StepRow({ step, index }: { step: Step; index: number }) {
  const tone =
    step.phase === "naar"
      ? { pill: "bg-blue-600 text-white", label: "naar mol" }
      : step.phase === "vanuit"
      ? { pill: "bg-slate-800 text-white", label: "vanuit mol" }
      : { pill: "bg-rose-500 text-white", label: "zijstap" };

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

interface ParamProps {
  id: ParamId;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  uitleg: string;
  status: "uit" | "gebruikt" | "optioneel" | "ontbreekt";
  children?: React.ReactNode;
}

function ParamCard({
  id,
  value,
  onChange,
  placeholder,
  uitleg,
  status,
  children,
}: ParamProps) {
  const meta = PARAM[id];
  return (
    <div
      className={`rounded-xl border-2 p-3 transition ${
        status === "ontbreekt"
          ? "border-amber-300 bg-amber-50"
          : status === "gebruikt"
          ? "border-blue-200 bg-blue-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <label
          htmlFor={`param-${id}`}
          className="text-sm font-bold tracking-tight text-slate-700"
        >
          {meta.label}
        </label>
        {status === "ontbreekt" ? (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
            nodig
          </span>
        ) : status === "gebruikt" ? (
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700">
            in gebruik
          </span>
        ) : status === "optioneel" ? (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-500">
            optioneel
          </span>
        ) : null}
      </div>
      <div className="relative">
        <input
          id={`param-${id}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 pr-16 text-base font-semibold tabular-nums focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
          {meta.unit}
        </span>
      </div>
      {children}
      <p className="mt-1.5 text-[11px] leading-tight text-slate-500">{uitleg}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function RekenschemaPage() {
  const [formule, setFormule] = useState("");
  const [mText, setMText] = useState("");
  const [rhoText, setRhoText] = useState("");
  const [vmText, setVmText] = useState("22,4");
  const [voplText, setVoplText] = useState("");
  const [source, setSource] = useState<FId | null>(null);
  const [raw, setRaw] = useState("");
  const [sig, setSig] = useState(4);

  /* molaire massa automatisch uit de formule */
  const auto = useMemo(() => {
    const f = formule.trim();
    if (!f) return { mass: NaN, fout: null as string | null };
    try {
      return { mass: calculate(f).mass, fout: null };
    } catch (e) {
      return { mass: NaN, fout: e instanceof Error ? e.message : "Onbekende formule." };
    }
  }, [formule]);

  const sol = useMemo(
    () =>
      solve({
        source,
        raw,
        M: parseNL(mText),
        rho: parseNL(rhoText),
        Vm: parseNL(vmText),
        Vopl: parseNL(voplText) / 1000,
        sig,
      }),
    [source, raw, mText, rhoText, vmText, voplText, sig]
  );

  const actieveChips = useMemo(() => {
    const s = new Set<string>();
    for (const st of sol.steps) {
      const k = STEP_TO_CHIP[`${st.from}>${st.to}`];
      if (k) s.add(k);
    }
    return s;
  }, [sol.steps]);

  const actieveEdges = useMemo(() => {
    const s = new Set<FId>();
    actieveChips.forEach((k) => s.add(k.split(":")[0] as FId));
    return s;
  }, [actieveChips]);

  /** Wat het rekenen nu écht tegenhoudt, versus takken die je erbij kúnt pakken. */
  const paramStatus = useMemo(() => {
    const s: Record<ParamId, "uit" | "gebruikt" | "optioneel" | "ontbreekt"> = {
      M: "uit",
      rho: "uit",
      Vm: "uit",
      Vopl: "uit",
    };
    Object.values(sol.blocked).forEach((b) => {
      if (b) s[b.param] = "optioneel";
    });
    sol.used.forEach((p) => (s[p] = "gebruikt"));
    if (sol.warn) s[sol.warn.param] = "ontbreekt";
    // Mol zonder volume → V is nodig om molariteit te krijgen
    if (source === "mol" && !parseNL(voplText) && sol.values.molariteit === undefined) {
      s.Vopl = "ontbreekt";
    }
    return s;
  }, [sol, source, voplText]);

  const voplNodig =
    (source === "mol" || source === "molariteit") &&
    !Number.isFinite(parseNL(voplText)) &&
    sol.values.molariteit === undefined;

  function veldWaarde(id: FId): string {
    if (source === id) return raw;
    return sol.values[id] ?? "";
  }

  function onVeld(id: FId, v: string) {
    if (!v.trim()) {
      setSource(null);
      setRaw("");
      return;
    }
    setSource(id);
    setRaw(v);
  }

  function onFormule(v: string) {
    setFormule(v);
    try {
      const r = calculate(v);
      setMText(toPlain(r.mass));
    } catch {
      /* laat M staan zoals hij is */
    }
  }

  function kiesStof(p: { f: string; rho?: string }) {
    onFormule(p.f);
    setRhoText(p.rho ?? "");
  }

  function laadOpgave(o: Opgave) {
    onFormule(o.formule);
    setRhoText(o.rho);
    setVoplText(o.vopl);
    setVmText("22,4");
    setSource(o.source);
    setRaw(o.raw);
    window.setTimeout(
      () =>
        document
          .getElementById("schema")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50
    );
  }

  function wisAlles() {
    setFormule("");
    setMText("");
    setRhoText("");
    setVmText("22,4");
    setVoplText("");
    setSource(null);
    setRaw("");
  }

  const nodeProps = (id: FId) => ({
    id,
    value: veldWaarde(id),
    pretty: sol.pretty[id],
    isSource: source === id,
    computed: source !== id && sol.values[id] !== undefined,
    blocked: sol.blocked[id],
    onChange: onVeld,
    ...(id === "molariteit"
      ? { vopl: voplText, onVopl: setVoplText, voplNodig }
      : {}),
  });

  return (
    <AppPage
      current="/rekenschema"
      title="Alles loopt via"
      titleHighlight="mol"
      description="Vul één vakje in dat je uit de opgave kent. De rest reken ik uit — en je ziet precies welke route over het schema is gelopen."
      tips={[
        {
          kicker: "de gouden regel",
          body: (
            <>
              <strong>Naar mol toe → delen.</strong> Van mol af → vermenigvuldigen.
            </>
          ),
        },
        {
          kicker: "de uitzondering",
          body: (
            <>
              Bij molariteit: <em>n = c × V</em>, want V staat onder de streep in
              c.
            </>
          ),
        },
        {
          kicker: "let op",
          body: (
            <>
              Volume vloeistof hangt aan de <strong>massa</strong>, niet
              rechtstreeks aan mol.
            </>
          ),
        },
      ]}
    >
        <StepSection
          step={1}
          first
          title="Welke stof heb je?"
          description="Typ de formule — de molaire massa reken ik er zelf bij."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div>
              <div className="relative">
                <input
                  value={formule}
                  onChange={(e) => onFormule(e.target.value)}
                  placeholder="bijv. H2O of Ca(OH)2"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-xl font-bold focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                />
              </div>

              {formule.trim() && (
                <div
                  className={`mt-2 rounded-xl px-3 py-2 text-sm ${
                    auto.fout
                      ? "bg-red-50 text-red-700"
                      : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {auto.fout ? (
                    auto.fout
                  ) : (
                    <>
                      <span className="font-serif text-base">
                        <FormulaView formula={formule.trim()} />
                      </span>{" "}
                      → M ={" "}
                      <strong className="tabular-nums">
                        {toPlain(auto.mass)} g/mol
                      </strong>
                    </>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.f}
                    onClick={() => kiesStof(p)}
                    title={p.naam}
                    className={`rounded-lg px-2.5 py-1 font-mono text-sm font-semibold transition ${
                      formule.trim() === p.f
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <FormulaView formula={p.f} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ParamCard
                id="M"
                value={mText}
                onChange={setMText}
                placeholder="18,02"
                uitleg="Nodig voor elke stap tussen gram en mol."
                status={paramStatus.M}
              />
              <ParamCard
                id="rho"
                value={rhoText}
                onChange={setRhoText}
                placeholder="1,00"
                uitleg="Alleen nodig als je met een volume vloeistof werkt."
                status={paramStatus.rho}
              />
              <ParamCard
                id="Vm"
                value={vmText}
                onChange={setVmText}
                placeholder="22,4"
                uitleg="Alleen voor gassen. Hangt af van temperatuur en druk."
                status={paramStatus.Vm}
              >
                <div className="mt-1.5 flex gap-1">
                  {[
                    { v: "22,4", l: "0 °C" },
                    { v: "24,5", l: "25 °C" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setVmText(o.v)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold transition ${
                        vmText === o.v
                          ? "bg-sky-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {o.v} · {o.l}
                    </button>
                  ))}
                </div>
              </ParamCard>
              <ParamCard
                id="Vopl"
                value={voplText}
                onChange={setVoplText}
                placeholder="250"
                uitleg="Het volume waarin de stof is opgelost. Reken ik om naar liter."
                status={paramStatus.Vopl}
              >
                {parseNL(voplText) > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                    = {toPlain(parseNL(voplText) / 1000)} L
                  </p>
                )}
              </ParamCard>
            </div>
          </div>
        </StepSection>

        <StepSection
          id="schema"
          step={2}
          title="Vul je gegeven in"
          description="Eén vakje is genoeg. Groen = van jou, gekleurd = door mij berekend."
          headerExtra={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                significante cijfers
              </span>
              <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-200">
                {[2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
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
              <span className="text-xs text-slate-500">
                · grote/kleine getallen als a × 10ⁿ
              </span>
            </div>
          }
        >
          {sol.warn && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
              <span className="text-lg" aria-hidden>
                ⚠️
              </span>
              <p className="flex-1 text-sm font-semibold text-amber-900">
                {sol.warn.text}
              </p>
              <button
                onClick={() => sol.warn && focusParam(sol.warn.param)}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-600"
              >
                Ga erheen
              </button>
            </div>
          )}

          {/* --- diagram (grote schermen) --- */}
          <div
            className="relative mx-auto hidden w-full max-w-[920px] rounded-2xl bg-slate-50/70 ring-1 ring-slate-100 lg:block"
            style={{ aspectRatio: "11 / 10" }}
          >
            <div
              className="pointer-events-none absolute left-1/2 top-[42%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/20 blur-3xl"
              aria-hidden
            />

            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {EDGES.map((e) => {
                const a = POS[e.a];
                const b = POS[e.b];
                const actief = actieveEdges.has(e.key);
                return (
                  <g key={e.key}>
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#e2e8f0"
                      strokeWidth={4}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {actief && (
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={SKIN[e.key].line}
                        strokeWidth={4}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="edge-flow"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {CHIPS.map((c) => {
              const actief = actieveChips.has(`${c.key}:${c.dir}`);
              return (
                <div
                  key={`${c.key}-${c.dir}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-black tabular-nums transition ${
                    actief
                      ? "border-transparent text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-400"
                  }`}
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    backgroundColor: actief ? SKIN[c.key].line : undefined,
                  }}
                >
                  {c.text}
                </div>
              );
            })}

            {(Object.keys(POS) as FId[]).map((id) => (
              <div
                key={id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${POS[id].x}%`,
                  top: `${POS[id].y}%`,
                  width: id === "mol" ? 232 : id === "molariteit" ? 220 : 196,
                }}
              >
                <NodeCard {...nodeProps(id)} hub={id === "mol"} />
              </div>
            ))}
          </div>

          {/* --- gestapeld (kleine schermen) --- */}
          <div className="lg:hidden">
            <NodeCard {...nodeProps("mol")} hub />

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Direct verbonden met mol
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["gram", "deeltjes", "gasvolume", "molariteit"] as FId[]).map(
                (id) => (
                  <div key={id}>
                    <div className="mb-1 flex items-center justify-center gap-2 text-[11px] font-black">
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          actieveChips.has(`${id}:naar`)
                            ? "text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                        style={{
                          backgroundColor: actieveChips.has(`${id}:naar`)
                            ? SKIN[id].line
                            : undefined,
                        }}
                      >
                        {id === "gram"
                          ? "÷ M"
                          : id === "deeltjes"
                          ? "÷ Nₐ"
                          : id === "gasvolume"
                          ? "÷ Vₘ"
                          : "× V"}{" "}
                        ↓ naar mol
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 ${
                          actieveChips.has(`${id}:vanuit`)
                            ? "text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                        style={{
                          backgroundColor: actieveChips.has(`${id}:vanuit`)
                            ? SKIN[id].line
                            : undefined,
                        }}
                      >
                        ↑{" "}
                        {id === "gram"
                          ? "× M"
                          : id === "deeltjes"
                          ? "× Nₐ"
                          : id === "gasvolume"
                          ? "× Vₘ"
                          : "÷ V"}
                      </span>
                    </div>
                    <NodeCard {...nodeProps(id)} />
                  </div>
                )
              )}
            </div>

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Loopt via de massa
            </p>
            <NodeCard {...nodeProps("volume")} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={wisAlles}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Wis alles
            </button>
            <span className="text-sm text-slate-400">of pak een opgave:</span>
            {OPGAVEN.map((o) => (
              <button
                key={o.titel}
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
          step={3}
          title="Zo schrijf je het op"
          description="Formule, ingevulde getallen, antwoord — precies zoals je docent het wil zien."
        >
          {sol.steps.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
              <p className="text-3xl" aria-hidden>
                🧪
              </p>
              <p className="mt-2 font-bold text-slate-600">
                Nog niets ingevuld.
              </p>
              <p className="text-sm text-slate-500">
                Vul hierboven een vakje in, dan verschijnt hier je volledige
                uitwerking.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {sol.steps.map((s, i) => (
                <StepRow key={s.id} step={s} index={i + 1} />
              ))}
            </ol>
          )}
        </StepSection>

        <StepSection
          title="Spiekbrief"
          description="De kleuren horen bij de takken van het schema hierboven."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["gram", "n = m ÷ M", "mol = gram ÷ molaire massa"],
                ["gram", "m = n × M", "gram = mol × molaire massa"],
                ["deeltjes", "n = N ÷ Nₐ", `deeltjes ÷ ${NA_PRETTY}`],
                ["deeltjes", "N = n × Nₐ", `mol × ${NA_PRETTY}`],
                ["gasvolume", "n = V ÷ Vₘ", "dm³ gas ÷ 22,4"],
                ["gasvolume", "V = n × Vₘ", "mol × 22,4 = dm³ gas"],
                ["molariteit", "n = c × V", "mol/L × liter oplossing"],
                ["molariteit", "c = n ÷ V", "mol ÷ liter oplossing"],
                ["volume", "m = V × ρ", "mL × dichtheid = gram"],
                ["volume", "V = m ÷ ρ", "gram ÷ dichtheid = mL"],
              ] as [FId, string, string][]
            ).map(([id, f, uitleg]) => (
              <div
                key={f}
                className={`rounded-xl border-l-4 p-3 ${SKIN[id].soft}`}
                style={{ borderLeftColor: SKIN[id].line }}
              >
                <div className="font-mono text-base font-black text-slate-800">
                  {f}
                </div>
                <div className="text-xs text-slate-600">{uitleg}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Avogadro
              </div>
              <div className="font-mono text-lg font-black">
                Nₐ = {NA_PRETTY}
              </div>
              <div className="text-xs text-slate-400">deeltjes per mol</div>
            </div>
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Molair volume
              </div>
              <div className="font-mono text-lg font-black">Vₘ = 22,4</div>
              <div className="text-xs text-slate-400">
                dm³/mol bij 0 °C en p⁰
              </div>
            </div>
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Wetenschappelijke notatie
              </div>
              <div className="font-mono text-lg font-black">
                a × 10ⁿ
              </div>
              <div className="text-xs text-slate-400">
                bijv. 2,5 × 10⁻² of 1,2 × 10³ — met significante cijfers
              </div>
            </div>
          </div>
        </StepSection>
    </AppPage>
  );
}
