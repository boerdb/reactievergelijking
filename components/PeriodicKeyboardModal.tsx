"use client";

import { useEffect, useRef, useState } from "react";
import {
  GROUP_STYLES,
  groupOf,
  nameOf,
  LANTHANIDES,
  ACTINIDES,
  type GroupName,
} from "@/lib/periodic";

type Cell = string | null;

const PERIODIC_GRID: Cell[][] = [
  ["H", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "He"],
  ["Li", "Be", null, null, null, null, null, null, null, null, null, null, "B", "C", "N", "O", "F", "Ne"],
  ["Na", "Mg", null, null, null, null, null, null, null, null, null, null, "Al", "Si", "P", "S", "Cl", "Ar"],
  ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
  ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
  ["Cs", "Ba", "*", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
  ["Fr", "Ra", "**", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
];

const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const CHARGES = ["+", "-", "2+", "2-", "3+", "3-"];

interface Props {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

export default function PeriodicKeyboardModal({
  open,
  initial,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initial);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function insert(text: string) {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function backspace() {
    const el = inputRef.current;
    if (!el) {
      setValue((v) => v.slice(0, -1));
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    if (start !== end) {
      setValue(value.slice(0, start) + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      setValue(value.slice(0, start - 1) + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    }
  }

  function clearAll() {
    setValue("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function save() {
    onSave(value);
    onClose();
  }

  const keyBtn =
    "rounded-md border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 active:bg-slate-900 select-none";
  const elemBase =
    "rounded-md border px-1 py-1.5 text-xs font-semibold transition active:scale-95 select-none";
  const elemSmBase =
    "rounded border px-1 py-1 text-[10px] font-semibold transition active:scale-95 select-none";

  function elemClass(sym: string): string {
    const g: GroupName = groupOf(sym);
    return `${elemBase} ${GROUP_STYLES[g].btn}`;
  }
  function elemSmClass(sym: string): string {
    const g: GroupName = groupOf(sym);
    return `${elemSmBase} ${GROUP_STYLES[g].btn}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-slate-900 p-3 sm:p-4 shadow-2xl ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            ✕ Annuleren
          </button>
          <h2 className="text-sm font-semibold text-slate-300 hidden sm:block">
            Bouw de vergelijking
          </h2>
          <button
            onClick={save}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            ✓ Opslaan
          </button>
        </div>

        {/* Invoerveld */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="bijv. 2 H2 + O2 -> 2 H2O"
          className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 font-mono text-base sm:text-lg text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          spellCheck={false}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
        />

        {/* Cijferrits */}
        <div className="mb-2 grid grid-cols-10 gap-1">
          {NUMBERS.map((n) => (
            <button key={n} className={keyBtn} onClick={() => insert(n)}>
              {n}
            </button>
          ))}
        </div>

        {/* Symbool- en lading-rij */}
        <div className="mb-3 grid grid-cols-4 sm:grid-cols-9 gap-1">
          <button className={keyBtn} onClick={() => insert("(")}>(</button>
          <button className={keyBtn} onClick={() => insert(")")}>)</button>
          <button className={keyBtn} onClick={() => insert(" + ")}>+</button>
          <button className={keyBtn} onClick={() => insert(" -> ")}>→</button>
          <button className={keyBtn} onClick={() => insert(".")}>·</button>
          <button className={keyBtn} onClick={backspace}>⌫</button>
          <button
            className={`${keyBtn} col-span-1`}
            onClick={clearAll}
          >
            Wis
          </button>
          {/* Lading-knoppen — voegen superscript toe */}
          {CHARGES.slice(0, 2).map((c) => (
            <button
              key={c}
              className={keyBtn}
              onClick={() => insert(c)}
              title="Lading"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Extra lading-knoppen (mobiel onder elkaar, desktop één rij) */}
        <div className="mb-3 grid grid-cols-4 sm:grid-cols-6 gap-1">
          {CHARGES.slice(2).map((c) => (
            <button
              key={c}
              className={keyBtn}
              onClick={() => insert(c)}
              title="Lading"
            >
              {c}
            </button>
          ))}
          <span className="col-span-2 sm:col-span-1 self-center text-[10px] text-slate-500 sm:col-start-6 text-right">
            ladingen
          </span>
        </div>

        {/* Periodiek systeem — scrollbaar op mobiel */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="min-w-[560px]">
            {PERIODIC_GRID.map((row, r) => (
              <div key={r} className="mb-1 grid grid-cols-18 gap-1">
                {row.map((cell, c) => {
                  if (cell === null) return <div key={c} />;
                  if (cell === "*" || cell === "**") {
                    return (
                      <div
                        key={c}
                        className="flex items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900 px-1 py-1.5 text-[10px] text-slate-500"
                      >
                        {cell}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={c}
                      className={elemClass(cell)}
                      onClick={() => insert(cell)}
                      title={`${cell} — ${nameOf(cell)} (${GROUP_STYLES[groupOf(cell)].label})`}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
            ))}

            <div className="mt-2 mb-1 grid grid-cols-15 gap-1">
              {LANTHANIDES.map((el) => (
                <button
                  key={el}
                  className={elemSmClass(el)}
                  onClick={() => insert(el)}
                  title={`${el} — ${nameOf(el)} (${GROUP_STYLES[groupOf(el)].label})`}
                >
                  {el}
                </button>
              ))}
            </div>
            <div className="mb-1 grid grid-cols-15 gap-1">
              {ACTINIDES.map((el) => (
                <button
                  key={el}
                  className={elemSmClass(el)}
                  onClick={() => insert(el)}
                  title={`${el} — ${nameOf(el)} (${GROUP_STYLES[groupOf(el)].label})`}
                >
                  {el}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
          {(Object.keys(GROUP_STYLES) as GroupName[])
            .filter((g) => g !== "onbekend")
            .map((g) => (
              <span key={g} className="flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded border ${GROUP_STYLES[g].swatch}`} />
                {GROUP_STYLES[g].label}
              </span>
            ))}
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          <kbd className="rounded bg-slate-800 px-1">Enter</kbd> opslaan ·{" "}
          <kbd className="rounded bg-slate-800 px-1">Esc</kbd> annuleren
        </p>
      </div>
    </div>
  );
}
