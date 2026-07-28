// Groepsindeling van het periodiek systeem — gebruikt door de kleuren van
// de elementknoppen in de popup.
// Sleutel = element-symbool, waarde = groepsnaam (zie GROUP_STYLES).

export type GroupName =
  | "alkalimetaal"
  | "aardalkalimetaal"
  | "overgangsmetaal"
  | "hoofdgroep-metaal"
  | "metalloide"
  | "niet-metaal"
  | "halogeen"
  | "edelgas"
  | "lanthanide"
  | "actinide"
  | "onbekend";

export const GROUP_STYLES: Record<
  GroupName,
  { label: string; btn: string; swatch: string }
> = {
  alkalimetaal: {
    label: "Alkalimetaal",
    btn: "bg-red-600 border-red-300 hover:bg-red-500 text-white",
    swatch: "bg-red-600 border-red-300",
  },
  aardalkalimetaal: {
    label: "Aardalkalimetaal",
    btn: "bg-orange-500 border-orange-200 hover:bg-orange-400 text-white",
    swatch: "bg-orange-500 border-orange-200",
  },
  overgangsmetaal: {
    label: "Overgangsmetaal",
    btn: "bg-amber-400 border-amber-200 hover:bg-amber-300 text-slate-900",
    swatch: "bg-amber-400 border-amber-200",
  },
  "hoofdgroep-metaal": {
    label: "Hoofdgroepmetaal",
    btn: "bg-sky-600 border-sky-300 hover:bg-sky-500 text-white",
    swatch: "bg-sky-600 border-sky-300",
  },
  metalloide: {
    label: "Metalloïde",
    btn: "bg-teal-600 border-teal-300 hover:bg-teal-500 text-white",
    swatch: "bg-teal-600 border-teal-300",
  },
  "niet-metaal": {
    label: "Niet-metaal",
    btn: "bg-emerald-600 border-emerald-300 hover:bg-emerald-500 text-white",
    swatch: "bg-emerald-600 border-emerald-300",
  },
  halogeen: {
    label: "Halogeen",
    btn: "bg-violet-600 border-violet-300 hover:bg-violet-500 text-white",
    swatch: "bg-violet-600 border-violet-300",
  },
  edelgas: {
    label: "Edelgas",
    btn: "bg-indigo-600 border-indigo-300 hover:bg-indigo-500 text-white",
    swatch: "bg-indigo-600 border-indigo-300",
  },
  lanthanide: {
    label: "Lanthanide",
    btn: "bg-fuchsia-600 border-fuchsia-300 hover:bg-fuchsia-500 text-white",
    swatch: "bg-fuchsia-600 border-fuchsia-300",
  },
  actinide: {
    label: "Actinide",
    btn: "bg-pink-500 border-pink-200 hover:bg-pink-400 text-white",
    swatch: "bg-pink-500 border-pink-200",
  },
  onbekend: {
    label: "Onbekend",
    btn: "bg-slate-700 border-slate-500 hover:bg-slate-600 text-slate-100",
    swatch: "bg-slate-700 border-slate-500",
  },
};

export const ELEMENT_GROUP: Record<string, GroupName> = {
  H: "niet-metaal", He: "edelgas",
  Li: "alkalimetaal", Be: "aardalkalimetaal", B: "metalloide", C: "niet-metaal", N: "niet-metaal", O: "niet-metaal", F: "halogeen", Ne: "edelgas",
  Na: "alkalimetaal", Mg: "aardalkalimetaal", Al: "hoofdgroep-metaal", Si: "metalloide", P: "niet-metaal", S: "niet-metaal", Cl: "halogeen", Ar: "edelgas",
  K: "alkalimetaal", Ca: "aardalkalimetaal", Sc: "overgangsmetaal", Ti: "overgangsmetaal", V: "overgangsmetaal", Cr: "overgangsmetaal", Mn: "overgangsmetaal", Fe: "overgangsmetaal", Co: "overgangsmetaal", Ni: "overgangsmetaal", Cu: "overgangsmetaal", Zn: "overgangsmetaal", Ga: "hoofdgroep-metaal", Ge: "metalloide", As: "metalloide", Se: "niet-metaal", Br: "halogeen", Kr: "edelgas",
  Rb: "alkalimetaal", Sr: "aardalkalimetaal", Y: "overgangsmetaal", Zr: "overgangsmetaal", Nb: "overgangsmetaal", Mo: "overgangsmetaal", Tc: "overgangsmetaal", Ru: "overgangsmetaal", Rh: "overgangsmetaal", Pd: "overgangsmetaal", Ag: "overgangsmetaal", Cd: "overgangsmetaal", In: "hoofdgroep-metaal", Sn: "hoofdgroep-metaal", Sb: "metalloide", Te: "metalloide", I: "halogeen", Xe: "edelgas",
  Cs: "alkalimetaal", Ba: "aardalkalimetaal", Hf: "overgangsmetaal", Ta: "overgangsmetaal", W: "overgangsmetaal", Re: "overgangsmetaal", Os: "overgangsmetaal", Ir: "overgangsmetaal", Pt: "overgangsmetaal", Au: "overgangsmetaal", Hg: "overgangsmetaal", Tl: "hoofdgroep-metaal", Pb: "hoofdgroep-metaal", Bi: "hoofdgroep-metaal", Po: "metalloide", At: "halogeen", Rn: "edelgas",
  Fr: "alkalimetaal", Ra: "aardalkalimetaal", Rf: "overgangsmetaal", Db: "overgangsmetaal", Sg: "overgangsmetaal", Bh: "overgangsmetaal", Hs: "overgangsmetaal", Mt: "onbekend", Ds: "onbekend", Rg: "onbekend", Cn: "onbekend", Nh: "onbekend", Fl: "onbekend", Mc: "onbekend", Lv: "onbekend", Ts: "onbekend", Og: "onbekend",
};

// Lanthaniden / actiniden — aparte rijen onderaan.
export const LANTHANIDES = ["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"];
export const ACTINIDES = ["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"];

export function groupOf(sym: string): GroupName {
  if (LANTHANIDES.includes(sym)) return "lanthanide";
  if (ACTINIDES.includes(sym)) return "actinide";
  return ELEMENT_GROUP[sym] ?? "onbekend";
}

// Nederlandse namen van de elementen. Voor elementen met een internationale
// naam die in het Nederlands gelijk is, gebruiken we die naam toch om de
// tooltip eenduidig te houden.
export const ELEMENT_NL: Record<string, string> = {
  H: "Waterstof", He: "Helium",
  Li: "Lithium", Be: "Beryllium", B: "Boor", C: "Koolstof", N: "Stikstof", O: "Zuurstof", F: "Fluor", Ne: "Neon",
  Na: "Natrium", Mg: "Magnesium", Al: "Aluminium", Si: "Silicium", P: "Fosfor", S: "Zwavel", Cl: "Chloor", Ar: "Argon",
  K: "Kalium", Ca: "Calcium", Sc: "Scandium", Ti: "Titanium", V: "Vanadium", Cr: "Chroom", Mn: "Mangaan", Fe: "IJzer", Co: "Kobalt", Ni: "Nikkel", Cu: "Koper", Zn: "Zink", Ga: "Gallium", Ge: "Germanium", As: "Arseen", Se: "Selenium", Br: "Broom", Kr: "Krypton",
  Rb: "Rubidium", Sr: "Strontium", Y: "Yttrium", Zr: "Zirkonium", Nb: "Niobium", Mo: "Molybdeen", Tc: "Technetium", Ru: "Ruthenium", Rh: "Rhodium", Pd: "Palladium", Ag: "Zilver", Cd: "Cadmium", In: "Indium", Sn: "Tin", Sb: "Antimoon", Te: "Telluur", I: "Jodium", Xe: "Xenon",
  Cs: "Cesium", Ba: "Barium", Hf: "Hafnium", Ta: "Tantaal", W: "Wolfraam", Re: "Rhenium", Os: "Osmium", Ir: "Iridium", Pt: "Platina", Au: "Goud", Hg: "Kwik", Tl: "Thallium", Pb: "Lood", Bi: "Bismut", Po: "Polonium", At: "Astaat", Rn: "Radon",
  Fr: "Francium", Ra: "Radium", Rf: "Rutherfordium", Db: "Dubnium", Sg: "Seaborgium", Bh: "Bohrium", Hs: "Hassium", Mt: "Meitnerium", Ds: "Darmstadtium", Rg: "Röntgenium", Cn: "Copernicium", Nh: "Nihonium", Fl: "Flerovium", Mc: "Moscovium", Lv: "Livermorium", Ts: "Tennessine", Og: "Oganesson",
  La: "Lanthaan", Ce: "Cerium", Pr: "Praseodymium", Nd: "Neodymium", Pm: "Promethium", Sm: "Samarium", Eu: "Europium", Gd: "Gadolinium", Tb: "Terbium", Dy: "Dysprosium", Ho: "Holmium", Er: "Erbium", Tm: "Thulium", Yb: "Ytterbium", Lu: "Lutetium",
  Ac: "Actinium", Th: "Thorium", Pa: "Protactinium", U: "Uranium", Np: "Neptunium", Pu: "Plutonium", Am: "Americium", Cm: "Curium", Bk: "Berkelium", Cf: "Californium", Es: "Einsteinium", Fm: "Fermium", Md: "Mendelevium", No: "Nobelium", Lr: "Lawrencium",
};

export function nameOf(sym: string): string {
  return ELEMENT_NL[sym] ?? sym;
}
