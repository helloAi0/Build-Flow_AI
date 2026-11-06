import { getModule, type ModuleField } from "./modules";

/**
 * Deterministic fallback seed generator. Used to guarantee that no generated
 * module is ever empty, even if the AI omitted seed records for it.
 */
const FIRST = ["Aisha", "Marcus", "Priya", "Diego", "Hannah", "Kenji", "Lucia", "Omar", "Nora", "Ravi", "Elena", "Samir"];
const LAST = ["Khan", "Rivera", "Sharma", "Okafor", "Novak", "Tanaka", "Costa", "Haddad", "Lindqvist", "Mehta", "Duarte", "Ali"];
const WORDS = ["Premium", "Standard", "Express", "Classic", "Deluxe", "Essential", "Pro", "Starter", "Signature", "Everyday"];
const NOUNS = ["Service", "Package", "Plan", "Item", "Unit", "Session", "Bundle", "Kit", "Order", "Entry"];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }
function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function isoDateTime(offsetDays: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function valueFor(field: ModuleField, i: number, kind: string): unknown {
  const key = field.key.toLowerCase();
  const person = `${pick(FIRST, i)} ${pick(LAST, i + 3)}`;
  switch (field.type) {
    case "number":
      if (/rating/.test(key)) return (i % 5) + 1;
      if (/stock|seats|capacity|party|quantity|qty|stops|tickets|bedrooms/.test(key)) return 4 + ((i * 3) % 40);
      if (/hours|duration/.test(key)) return 1 + (i % 8);
      if (/score/.test(key)) return 55 + ((i * 7) % 45);
      if (/max_score/.test(key)) return 100;
      return 100 + ((i * 137) % 4000);
    case "date":
      return isoDate(/due|end|renews|expiry|eta|valid/.test(key) ? 7 + i * 3 : -(i * 3));
    case "datetime":
      return isoDateTime(1 + i, 9 + (i % 8));
    case "boolean":
      return i % 3 !== 2;
    case "select":
      return field.options?.[i % (field.options.length || 1)] ?? "";
    case "tags":
      return [pick(WORDS, i).toLowerCase(), pick(NOUNS, i + 1).toLowerCase()];
    case "url":
      return `https://example.com/${kind}/${i + 1}`;
    case "textarea":
      return `${pick(WORDS, i)} ${pick(NOUNS, i)} — auto-generated starter record ${i + 1}. Edit or delete this anytime.`;
    default:
      if (/email/.test(key)) return `${pick(FIRST, i).toLowerCase()}.${pick(LAST, i + 3).toLowerCase()}@example.com`;
      if (/phone/.test(key)) return `+1 555 0${100 + i}`;
      if (/customer|patient|student|donor|tenant|guardian|person|employee|staff|driver|doctor|teacher|assignee|owner|author|instructor|manager|party|donor/.test(key)) return person;
      if (/^name$/.test(key)) return /patient|student|member|tenant|staff|employee|doctor|teacher|driver/.test(kind) ? person : `${pick(WORDS, i)} ${pick(NOUNS, i)}`;
      if (/number|reference|tracking|ticket|roll|sku|batch|tag|plate/.test(key)) return `${kind.slice(0, 3).toUpperCase()}-${1000 + i}`;
      if (/slug/.test(key)) return `/${kind}-${i + 1}`;
      if (/address|location|venue|origin|destination|unit|room/.test(key)) return `${100 + i} Market Street, Suite ${i + 1}`;
      if (/period|term/.test(key)) return isoDate(-(i * 30)).slice(0, 7);
      if (/title|subject|description|category|type|speciality|subjects|service|item/.test(key)) return `${pick(WORDS, i)} ${pick(NOUNS, i + 2)}`;
      return `${pick(WORDS, i)} ${pick(NOUNS, i)}`;
  }
}

export function generateSeedRecords(kind: string, count = 8): Record<string, unknown>[] {
  const def = getModule(kind);
  if (!def || def.virtual || def.fields.length === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const f of def.fields) row[f.key] = valueFor(f, i, kind);
    return row;
  });
}

/** Fill missing/blank required fields on an AI-provided record. */
export function repairRecord(kind: string, record: Record<string, unknown>, index = 0): Record<string, unknown> {
  const def = getModule(kind);
  if (!def) return record;
  const out: Record<string, unknown> = { ...record };
  for (const f of def.fields) {
    const v = out[f.key];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (f.required && empty) out[f.key] = valueFor(f, index, kind);
    if (f.type === "number" && typeof v === "string") {
      const n = Number(String(v).replace(/[^0-9.-]/g, ""));
      if (!Number.isNaN(n)) out[f.key] = n;
    }
  }
  return out;
}
