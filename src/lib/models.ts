export const CLASS_NAMES = [
  "BA",
  "CA",
  "DA",
  "DHA",
  "GA",
  "HA",
  "JA",
  "KA",
  "LA",
  "MA",
  "NA",
  "NGA",
  "NYA",
  "PA",
  "RA",
  "SA",
  "TA",
  "THA",
  "WA",
  "YA",
  "unknown",
] as const;

export type AksaraClass = (typeof CLASS_NAMES)[number];


export interface ModelVersion {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
}

export const MODEL_VERSIONS: ModelVersion[] = [
  {
    id: "v1",
    label: "V1",
    description: "First fine-tune (layers frozen 0-13)",
  },
  {
    id: "v1.1",
    label: "V1.1",
    description: "Refined V1",
  },
  {
    id: "v2",
    label: "V2",
    description: "Unfreeze from layer 10",
  },
  {
    id: "v2.1",
    label: "V2.1",
    description: "Refined V2",
  },
  {
    id: "v3",
    label: "V3",
    description: "Unfreeze from layer 14",
  },
  {
    id: "v3.1",
    label: "V3.1",
    description: "Refined V3",
  },
  {
    id: "v3.2",
    label: "V3.2",
    description: "Best model (recommended)",
    recommended: true,
  },
  {
    id: "v4", // Matches the exported ONNX file name
    label: "V4",
    description: "21 Classes (Includes Unknown), Ha-Na-Ca-Ra-Ka Order",
    recommended: true,
  },
];

export const DEFAULT_MODEL = "v4";

export const MODEL_FILE = (version: string) => `/models/${version}.onnx`;

export const CHAR_INFO: Record<AksaraClass, { name: string; aksara: string }> = {
  BA: { name: "Ba", aksara: "ꦧ" },
  CA: { name: "Ca", aksara: "ꦕ" },
  DA: { name: "Da", aksara: "ꦢ" },
  DHA: { name: "Dha", aksara: "ꦣ" },
  GA: { name: "Ga", aksara: "ꦒ" },
  HA: { name: "Ha", aksara: "ꦲ" },
  JA: { name: "Ja", aksara: "ꦗ" },
  KA: { name: "Ka", aksara: "ꦏ" },
  LA: { name: "La", aksara: "ꦭ" },
  MA: { name: "Ma", aksara: "ꦩ" },
  NA: { name: "Na", aksara: "ꦤ" },
  NGA: { name: "Nga", aksara: "ꦔ" },
  NYA: { name: "Nya", aksara: "ꦚ" },
  PA: { name: "Pa", aksara: "ꦥ" },
  RA: { name: "Ra", aksara: "ꦫ" },
  SA: { name: "Sa", aksara: "ꦱ" },
  TA: { name: "Ta", aksara: "ꦠ" },
  THA: { name: "Tha", aksara: "ꦛ" },
  WA: { name: "Wa", aksara: "ꦮ" },
  YA: { name: "Ya", aksara: "ꦪ" },
  unknown: { name: "Unknown", aksara: "?" },
};