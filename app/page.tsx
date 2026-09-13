"use client";

import { useMemo, useState } from "react";
import PeriodicKeyboardModal from "@/components/PeriodicKeyboardModal";
import {
  AppPage,
  StepSection,
  btnDark,
  btnGhost,
  btnPrimary,
  btnSuccess,
  chipExample,
  chipExampleActive,
  inputClass,
} from "@/components/AppShell";
import {
  parseEquation,
  ParseError,
  compareSides,
  isBalanced,
  tokenizeFormula,
  equationToUnicode,
  equationToHtml,
  type ParsedEquation,
  type ElementStatus,
  type FormulaPiece,
} from "@/lib/parser";

const EXAMPLES = [
  "2 H2 + O2 -> 2 H2O",
  "CH4 + 2 O2 -> CO2 + 2 H2O",
  "Ca(OH)2 + 2 HCl -> CaCl2 + 2 H2O",
  "Fe + O2 -> Fe2O3",
  "CuSO4.5H2O -> CuSO4 + 5 H2O",
];

function FormulaView({ formula }: { formula: string }) {
  const pieces: FormulaPiece[] = useMemo(
    () => tokenizeFormula(formula),
    [formula]
  );
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

function SideView({ parsed, side }: { parsed: ParsedEquation; side: "left" | "right" }) {
  const s = parsed[side];
  return (
    <span>
      {s.particles.map((p, i) => (
        <span key={i}>
          {i > 0 && " + "}
          {p.coefficient !== 1 && (
            <span className="font-semibold">{p.coefficient} </span>
          )}
          <FormulaView formula={p.formula} />
        </span>
      ))}
    </span>
  );
}

interface Feedback {
  ok: boolean;
  message: string;
  details?: string;
  statuses?: ElementStatus[];
}

export default function Page() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedEquation | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  function handleCheck() {
    if (input.trim().length === 0) {
      setParsed(null);
      setFeedback({
        ok: false,
        message: "Voer eerst een vergelijking in.",
      });
      return;
    }
    try {
      const p = parseEquation(input);
      setParsed(p);
      const statuses = compareSides(p);
      const balanced = statuses.every((s) => s.balanced);
      if (balanced) {
        setFeedback({
          ok: true,
          message: "De vergelijking klopt! Alle atomen zijn in balans.",
          statuses,
        });
      } else {
        const wrong = statuses.filter((s) => !s.balanced);
        const detail = wrong
          .map(
            (s) =>
              `${s.element}: links ${s.left}, rechts ${s.right} (verschil ${
                s.diff > 0 ? "+" : ""
              }${s.diff})`
          )
          .join(" · ");
        setFeedback({
          ok: false,
          message: "De vergelijking klopt nog niet.",
          details: detail,
          statuses,
        });
      }
    } catch (e) {
      setParsed(null);
      const msg = e instanceof ParseError ? e.message : "Onverwachte fout bij het parsen.";
      setFeedback({ ok: false, message: msg });
    }
  }

  function handleClear() {
    setInput("");
    setParsed(null);
    setFeedback(null);
    setCopyState("idle");
  }

  async function copyToClipboard(text: string, html: string) {
    if (!parsed) return;
    try {
      // Probeer beide formats tegelijk te zetten (rich text + platte tekst).
      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopyState("ok");
    } catch {
      // Fallback: alleen platte tekst (Unicode-subscripts).
      try {
        await navigator.clipboard.writeText(text);
        setCopyState("ok");
      } catch {
        setCopyState("err");
      }
    }
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function handleCopyWord() {
    if (!parsed) return;
    const text = equationToUnicode(parsed);
    const html = equationToHtml(parsed);
    copyToClipboard(text, html);
  }

  function handleCopyPlain() {
    if (!parsed) return;
    const text = equationToUnicode(parsed);
    navigator.clipboard
      .writeText(text)
      .then(() => setCopyState("ok"))
      .catch(() => setCopyState("err"));
    setTimeout(() => setCopyState("idle"), 2000);
  }

  function loadExample(eq: string) {
    setInput(eq);
    setParsed(null);
    setFeedback(null);
    setCopyState("idle");
  }

  return (
    <AppPage
      current="/"
      title="Controleer je"
      titleHighlight="reactievergelijking"
      description="Voer een vergelijking in, controleer of alle atomen kloppen, en kopieer hem met subscripts naar Word voor je huiswerk."
      tips={[
        {
          kicker: "pijl",
          body: (
            <>
              Gebruik <strong>-&gt;</strong>, <strong>=&gt;</strong> of{" "}
              <strong>→</strong> tussen de twee kanten.
            </>
          ),
        },
        {
          kicker: "formules",
          body: (
            <>
              Haakjes en hydraten werken: <strong>Ca(OH)₂</strong>,{" "}
              <strong>CuSO₄·5H₂O</strong>.
            </>
          ),
        },
        {
          kicker: "privacy",
          body: (
            <>
              Geen opgeslagen data — alles draait in je <strong>browser</strong>.
            </>
          ),
        },
      ]}
    >
      <StepSection
        step={1}
        first
        title="Jouw vergelijking"
        description="Typ of plak de vergelijking. Druk op Enter of tik Controleer."
      >
        <label htmlFor="eq" className="sr-only">
          Jouw vergelijking
        </label>
        <input
          id="eq"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCheck();
          }}
          placeholder="bijv. 2 H2 + O2 -> 2 H2O"
          className={inputClass}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleCheck} className={btnPrimary}>
            Controleer
          </button>
          <button
            type="button"
            onClick={() => setKeyboardOpen(true)}
            className={btnDark}
            title="Open het periodiek systeem als invoerhulp"
          >
            ⌨ Elementenkiezer
          </button>
          <button type="button" onClick={handleClear} className={btnGhost}>
            Wissen
          </button>
          <button
            type="button"
            onClick={handleCopyWord}
            disabled={!parsed}
            className={btnSuccess}
          >
            Kopieer naar Word
          </button>
          <button
            type="button"
            onClick={handleCopyPlain}
            disabled={!parsed}
            className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Kopieer als tekst
          </button>
        </div>

        {copyState === "ok" && (
          <p className="mt-2 text-sm font-semibold text-emerald-700">
            Gekopieerd — plak in Word met Ctrl+V.
          </p>
        )}
        {copyState === "err" && (
          <p className="mt-2 text-sm font-semibold text-red-700">
            Kopiëren mislukt. Selecteer handmatig en gebruik Ctrl+C.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-sm text-slate-400">Voorbeelden:</span>
          {EXAMPLES.map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => loadExample(eq)}
              className={
                input.trim() === eq ? chipExampleActive : chipExample
              }
            >
              {eq}
            </button>
          ))}
        </div>
      </StepSection>

      <StepSection
        step={2}
        title="Uitkomst"
        description={
          parsed || feedback
            ? "Subscripts en balans per element."
            : "Controleer eerst een vergelijking — hier verschijnt je antwoord."
        }
      >
        {!parsed && !feedback ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center">
            <p className="text-3xl" aria-hidden>
              ⚗️
            </p>
            <p className="mt-2 font-bold text-slate-600">Nog niets gecontroleerd.</p>
            <p className="text-sm text-slate-500">
              Vul hierboven een vergelijking in en tik Controleer.
            </p>
          </div>
        ) : (
          <>
            {parsed && (
              <div className="overflow-x-auto rounded-xl bg-slate-50 px-4 py-4 font-serif text-2xl ring-1 ring-slate-100">
                <SideView parsed={parsed} side="left" />
                <span className="mx-3 text-slate-500">→</span>
                <SideView parsed={parsed} side="right" />
              </div>
            )}

            {feedback && (
              <div
                className={`mt-4 rounded-xl border-2 p-4 ${
                  feedback.ok
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <h3
                  className={`text-base font-black ${
                    feedback.ok ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  {feedback.ok ? "Klopt!" : "Niet kloppend"}
                </h3>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    feedback.ok ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {feedback.message}
                </p>
                {feedback.details && (
                  <p className="mt-2 font-mono text-sm text-red-700">
                    {feedback.details}
                  </p>
                )}

                {feedback.statuses && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-600">
                          <th className="py-1 pr-4">Element</th>
                          <th className="py-1 pr-4">Links</th>
                          <th className="py-1 pr-4">Rechts</th>
                          <th className="py-1 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedback.statuses.map((s) => (
                          <tr
                            key={s.element}
                            className={
                              s.balanced
                                ? "text-emerald-700"
                                : "font-semibold text-red-700"
                            }
                          >
                            <td className="py-1 pr-4 font-mono">{s.element}</td>
                            <td className="py-1 pr-4">{s.left}</td>
                            <td className="py-1 pr-4">{s.right}</td>
                            <td className="py-1 pr-4">
                              {s.balanced
                                ? "✓ in balans"
                                : `✗ verschil ${s.diff > 0 ? "+" : ""}${s.diff}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </StepSection>

      <PeriodicKeyboardModal
        open={keyboardOpen}
        initial={input}
        onClose={() => setKeyboardOpen(false)}
        onSave={(v) => {
          setInput(v);
          setParsed(null);
          setFeedback(null);
          setCopyState("idle");
        }}
      />
    </AppPage>
  );
}
