"use client";

import { useState } from "react";
import Link from "next/link";
import {
  calculate,
  CalcError,
  fmt,
  massPercentages,
  molFromMass,
  massFromMol,
  particlesFromMol,
  molFromParticles,
  AVOGADRO,
  type CalcResult,
} from "@/lib/calc";
import { tokenizeFormula } from "@/lib/parser";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";

const EXAMPLES = ["H2O", "CO2", "H2SO4", "Ca(OH)2", "C6H12O6", "NaCl", "Fe2O3", "CuSO4.5H2O"];

function FormulaView({ formula }: { formula: string }) {
  const pieces = tokenizeFormula(formula);
  return (
    <>
      {pieces.map((p, idx) =>
        p.type === "sub" ? (
          <sub key={idx}>{p.value}</sub>
        ) : (
          <span key={idx}>{p.value}</span>
        )
      )}
    </>
  );
}

export default function BerekenPage() {
  const [formula, setFormula] = useState("");
  const [charge, setCharge] = useState(0);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [molInput, setMolInput] = useState(""); // aantal mol
  const [gramInput, setGramInput] = useState(""); // massa in gram
  const [particleInput, setParticleInput] = useState(""); // aantal deeltjes

  function handleCalc() {
    if (formula.trim().length === 0) {
      setResult(null);
      setError("Voer een formule in.");
      return;
    }
    try {
      const r = calculate(formula, charge);
      setResult(r);
      setError(null);
    } catch (e) {
      setResult(null);
      const msg = e instanceof CalcError ? e.message : "Onverwachte fout.";
      setError(msg);
    }
  }

  function handleClear() {
    setFormula("");
    setCharge(0);
    setResult(null);
    setError(null);
  }

  function loadExample(f: string) {
    setFormula(f);
    setCharge(0);
    setResult(null);
    setError(null);
  }

  const chargeLabel =
    charge === 0
      ? "neutraal"
      : charge > 0
      ? `+${charge}`
      : `${charge}`;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <Link
            href="/"
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            ← Terug naar vergelijkingen
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Molecuulmassa &amp; deeltjes
          </h1>
          <p className="mt-2 text-slate-600">
            Voer een formule in om de molecuulmassa en het aantal protonen,
            neutronen en elektronen te berekenen.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label className="block text-sm font-medium text-slate-700">
            Formule
          </label>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCalc();
            }}
            placeholder="bijv. H2O of Ca(OH)2"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            spellCheck={false}
            autoComplete="off"
          />

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Lading
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button
                  onClick={() => setCharge((c) => c - 1)}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold hover:bg-slate-200"
                >
                  −
                </button>
                <span className="w-12 text-center font-mono text-lg">
                  {chargeLabel}
                </span>
                <button
                  onClick={() => setCharge((c) => c + 1)}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleCalc}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Bereken
            </button>
            <button
              onClick={() => setKeyboardOpen(true)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
            >
              ⌨ Elementenkiezer
            </button>
            <button
              onClick={handleClear}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Wissen
            </button>
          </div>
        </section>

        {/* Voorbeelden */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Voorbeelden</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((f) => (
              <button
                key={f}
                onClick={() => loadExample(f)}
                className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700 transition hover:bg-slate-200"
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Foutmelding */}
        {error && (
          <section className="mt-6 rounded-2xl bg-red-50 p-6 shadow-sm ring-1 ring-red-200">
            <h2 className="text-base font-semibold text-red-800">✗ Fout</h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </section>
        )}

        {/* Resultaat */}
        {result && (
          <>
            {/* Formule-weergave */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Formule</h2>
              <div className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-4 font-serif text-3xl">
                <FormulaView formula={result.formula} />
                {result.charge !== 0 && (
                  <sup className="ml-0.5">
                    {result.charge > 0 ? `+${result.charge}` : result.charge}
                  </sup>
                )}
              </div>
            </section>

            {/* Hoofdresultaten */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">Uitkomst</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Molecuulmassa" value={`${fmt(result.mass)} u`} accent />
                <Stat label="Protonen" value={String(result.protons)} />
                <Stat label="Neutronen" value={String(result.neutrons)} />
                <Stat label="Elektronen" value={String(result.electrons)} />
              </div>
              {result.charge !== 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  Lading: {result.charge > 0 ? "+" : ""}
                  {result.charge} — elektronen = protonen − |lading|
                </p>
              )}
            </section>

            {/* Per-element breakdown */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">
                Per element
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600 border-b border-slate-200">
                      <th className="py-2 pr-3">Element</th>
                      <th className="py-2 pr-3">Naam</th>
                      <th className="py-2 pr-3 text-right">Aantal</th>
                      <th className="py-2 pr-3 text-right">Z</th>
                      <th className="py-2 pr-3 text-right">Massa/atom (u)</th>
                      <th className="py-2 pr-3 text-right">Massa totaal (u)</th>
                      <th className="py-2 pr-3 text-right">N/atom</th>
                      <th className="py-2 pr-3 text-right">N totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((b) => (
                      <tr key={b.symbol} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-mono font-semibold">
                          {b.symbol}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{b.name}</td>
                        <td className="py-2 pr-3 text-right">{b.count}</td>
                        <td className="py-2 pr-3 text-right text-slate-500">
                          {b.z}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {fmt(b.massPerAtom)}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">
                          {fmt(b.massTotal)}
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-500">
                          {b.neutronsPerAtom}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {b.neutronsTotal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold border-t-2 border-slate-300">
                      <td className="py-2 pr-3" colSpan={5}>
                        Totaal
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(result.mass)} u
                      </td>
                      <td className="py-2 pr-3"></td>
                      <td className="py-2 pr-3 text-right">
                        {result.neutrons}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Atoommassa&apos;s zijn standaardwaarden (IUPAC). Het aantal
                neutronen is berekend als massagetal (afgeronde atoommassa) −
                atoomnummer; dit is een benadering voor elementen met meerdere
                isotopen.
              </p>
            </section>

            {/* Massapercentage */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">
                Massapercentage per element
              </h2>
              <div className="mt-3 space-y-3">
                {massPercentages(result).map((p) => (
                  <div key={p.symbol}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono font-semibold">
                        {p.symbol}{" "}
                        <span className="font-normal text-slate-600">
                          {p.name}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {fmt(p.pct)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.min(p.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Mol-berekeningen */}
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-700">
                Mol-berekeningen
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Molaire massa:{" "}
                <span className="font-mono font-semibold">
                  {fmt(result.mass)} g/mol
                </span>{" "}
                · Avogadro: {AVOGADRO.toExponential(4)} /mol
              </p>

              {/* massa → mol → deeltjes */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-600">
                  Van massa (g) naar mol &amp; deeltjes
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={gramInput}
                    onChange={(e) => setGramInput(e.target.value)}
                    placeholder="bijv. 18"
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <div className="self-center text-sm text-slate-500">g</div>
                </div>
                {gramInput && !isNaN(parseFloat(gramInput)) && (
                  <div className="mt-2 text-sm text-slate-700">
                    = <span className="font-semibold">
                      {fmt(molFromMass(parseFloat(gramInput), result.mass))} mol
                    </span>
                    {" = "}
                    <span className="font-semibold">
                      {particlesFromMol(molFromMass(parseFloat(gramInput), result.mass)).toExponential(3)}
                    </span>{" "}
                    deeltjes
                  </div>
                )}
              </div>

              {/* mol → massa → deeltjes */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-600">
                  Van mol naar massa &amp; deeltjes
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={molInput}
                    onChange={(e) => setMolInput(e.target.value)}
                    placeholder="bijv. 0.5"
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <div className="self-center text-sm text-slate-500">mol</div>
                </div>
                {molInput && !isNaN(parseFloat(molInput)) && (
                  <div className="mt-2 text-sm text-slate-700">
                    = <span className="font-semibold">
                      {fmt(massFromMol(parseFloat(molInput), result.mass))} g
                    </span>
                    {" = "}
                    <span className="font-semibold">
                      {particlesFromMol(parseFloat(molInput)).toExponential(3)}
                    </span>{" "}
                    deeltjes
                  </div>
                )}
              </div>

              {/* deeltjes → mol → massa */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-600">
                  Van aantal deeltjes naar mol &amp; massa
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={particleInput}
                    onChange={(e) => setParticleInput(e.target.value)}
                    placeholder="bijv. 3.011e23"
                    className="w-40 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                  <div className="self-center text-sm text-slate-500">
                    deeltjes
                  </div>
                </div>
                {particleInput && !isNaN(parseFloat(particleInput)) && (
                  <div className="mt-2 text-sm text-slate-700">
                    = <span className="font-semibold">
                      {fmt(molFromParticles(parseFloat(particleInput)))} mol
                    </span>
                    {" = "}
                    <span className="font-semibold">
                      {fmt(massFromMol(molFromParticles(parseFloat(particleInput)), result.mass))} g
                    </span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <PeriodicKeyboardModal
          open={keyboardOpen}
          initial={formula}
          onClose={() => setKeyboardOpen(false)}
          onSave={(v) => {
            setFormula(v);
            setResult(null);
            setError(null);
          }}
        />
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        accent
          ? "bg-brand-50 ring-1 ring-brand-200"
          : "bg-slate-50 ring-1 ring-slate-200"
      }`}
    >
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          accent ? "text-brand-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
