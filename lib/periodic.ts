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
  { label: string; btn: string }
> = {
  alkalimetaal: {
    label: "Alkalimetaal",
    btn: "bg-rose-900/70 border-rose-600 hover:bg-rose-700 text-rose-50",
  },
  aardalkalimetaal: {
    label: "Aardalkalimetaal",
    btn: "bg-orange-900/70 border-orange-600 hover:bg-orange-700 text-orange-50",
  },
  overgangsmetaal: {
    label: "Overgangsmetaal",
    btn: "bg-amber-900/70 border-amber-600 hover:bg-amber-700 text-amber-50",
  },
  "hoofdgroep-metaal": {
    label: "Hoofdgroepmetaal",
    btn: "bg-sky-900/70 border-sky-600 hover:bg-sky-700 text-sky-50",
  },
  metalloide: {
    label: "Metalloïde",
    btn: "bg-teal-900/70 border-teal-600 hover:bg-teal-700 text-teal-50",
  },
  "niet-metaal": {
    label: "Niet-metaal",
    btn: "bg-emerald-900/70 border-emerald-600 hover:bg-emerald-700 text-emerald-50",
  },
  halogeen: {
    label: "Halogeen",
    btn: "bg-violet-900/70 border-violet-600 hover:bg-violet-700 text-violet-50",
  },
  edelgas: {
    label: "Edelgas",
    btn: "bg-indigo-900/70 border-indigo-600 hover:bg-indigo-700 text-indigo-50",
  },
  lanthanide: {
    label: "Lanthanide",
    btn: "bg-fuchsia-900/70 border-fuchsia-600 hover:bg-fuchsia-700 text-fuchsia-50",
  },
  actinide: {
    label: "Actinide",
    btn: "bg-pink-900/70 border-pink-600 hover:bg-pink-700 text-pink-50",
  },
  onbekend: {
    label: "Onbekend",
    btn: "bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-100",
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
