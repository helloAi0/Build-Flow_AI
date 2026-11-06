import { getModule, amountKey, type ModuleDef, type ModuleField } from "./modules";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Fields the AI assistant added to (or hid on) a page live in the module's
 * config, so forms, lists, exports and workflows all pick them up from one
 * resolved definition.
 */
export function resolveModuleDef(kind: string, config: unknown): ModuleDef | null {
  const def = getModule(kind);
  if (!def) return null;
  const cfg = (config ?? {}) as Record<string, unknown>;
  const custom = Array.isArray(cfg["customFields"]) ? (cfg["customFields"] as ModuleField[]) : [];
  const hidden = new Set(Array.isArray(cfg["hiddenFields"]) ? (cfg["hiddenFields"] as string[]).map(String) : []);
  if (custom.length === 0 && hidden.size === 0) return def;

  const base = def.fields.filter((f) => !hidden.has(f.key));
  const extra = custom.filter((f) => f?.key && !base.some((b) => b.key === f.key));
  const fields = [...base, ...extra];
  const listColumns = [
    ...def.listColumns.filter((c) => !hidden.has(c)),
    ...extra.slice(0, 2).map((f) => f.key),
  ].slice(0, 6);
  return { ...def, fields, listColumns };
}

/**
 * Application Definition layer.
 *
 * BuildFlow Builder (projects + project_modules) -> AppDefinition -> Runtime.
 * The runtime renders ONLY from this definition: it never shows builder
 * concepts (modules, add module, assistant, workspace).
 */

export type AppModule = Tables<"project_modules">;
export type AppRecord = Tables<"module_records">;
export type AppProject = Tables<"projects">;

export type AppStatus = "generating" | "validating" | "ready" | "failed";

export type AppSettings = {
  businessName: string;
  logoText: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  timezone: string;
  language: string;
  notifications: boolean;
};

export type NavItem = {
  slug: string;
  title: string;
  kind: string;
  moduleId: string;
  type: "dashboard" | "records" | "reports" | "settings";
  def: ModuleDef;
  /** raw module config, so assistant-added fields reach runtime forms */
  config: unknown;
};

export type AppDefinition = {
  projectId: string;
  name: string;
  tagline: string;
  initials: string;
  status: AppStatus;
  isPublic: boolean;
  settings: AppSettings;
  nav: NavItem[];
  dashboard: NavItem | null;
};

export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD", "SGD", "ZAR", "NGN", "BRL", "JPY"];

export const DEFAULT_SETTINGS: AppSettings = {
  businessName: "",
  logoText: "",
  tagline: "",
  email: "",
  phone: "",
  address: "",
  currency: "USD",
  timezone: "UTC",
  language: "en",
  notifications: true,
};

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function readSettings(modules: AppModule[]): AppSettings {
  const mod = modules.find((m) => m.kind === "settings");
  const cfg = (mod?.config ?? {}) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...cfg };
}

export function readStatus(project: AppProject | null): AppStatus {
  const s = String(project?.status ?? "");
  if (s === "generating" || s === "validating" || s === "failed" || s === "ready") return s;
  // Legacy projects created before status tracking are treated as unvalidated.
  return "validating";
}

function navTypeFor(kind: string): NavItem["type"] {
  if (kind === "dashboard") return "dashboard";
  if (kind === "reports" || kind === "analytics") return "reports";
  if (kind === "settings") return "settings";
  return "records";
}

export function buildAppDefinition(project: AppProject, modules: AppModule[]): AppDefinition {
  const settings = readSettings(modules);
  const name = settings.businessName?.trim() || project.name;

  const used = new Set<string>();
  const nav: NavItem[] = [];
  for (const m of [...modules].sort((a, b) => a.position - b.position)) {
    const def = resolveModuleDef(m.kind, m.config);
    if (!def) continue;
    const type = navTypeFor(m.kind);
    let slug = type === "dashboard" ? "dashboard" : slugify(m.title || def.label);
    while (used.has(slug)) slug = `${slug}-2`;
    used.add(slug);
    nav.push({ slug, title: m.title || def.label, kind: m.kind, moduleId: m.id, type, def, config: m.config });
  }

  return {
    projectId: project.id,
    name,
    tagline: settings.tagline?.trim() || project.description || "",
    initials: (settings.logoText?.trim() || initialsOf(name)).slice(0, 3).toUpperCase(),
    status: readStatus(project),
    isPublic: !!(project as { is_public?: boolean }).is_public,
    settings,
    nav,
    dashboard: nav.find((n) => n.type === "dashboard") ?? null,
  };
}

export function formatMoney(n: number, currency: string): string {
  try {
    return n.toLocaleString(undefined, { style: "currency", currency, maximumFractionDigits: 0 });
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

/* ---------------- Business metrics computed from real records ---------------- */

export type AppMetrics = {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  overdue: number;
  inventoryValue: number;
  lowStock: Array<{ label: string; stock: number; threshold: number }>;
  counts: Record<string, number>;
  topItems: Array<{ label: string; amount: number }>;
  recent: Array<{ kind: string; label: string; when: string }>;
  total: number;
};

const REVENUE_KINDS = new Set(["payments", "sales", "orders", "donations", "fees", "transactions"]);
const EXPENSE_KINDS = new Set(["expenses", "purchases", "payroll"]);

function labelOf(d: Record<string, unknown>): string {
  return String(
    d.name ?? d.title ?? d.product ?? d.customer ?? d.number ?? d.reference ?? d.item ?? d.description ?? "Record",
  );
}

export function computeMetrics(
  records: Array<{ kind: string; data: unknown; created_at: string }>,
): AppMetrics {
  const counts: Record<string, number> = {};
  let revenue = 0;
  let expenses = 0;
  let outstanding = 0;
  let overdue = 0;
  let inventoryValue = 0;
  const lowStock: AppMetrics["lowStock"] = [];
  const topItems: AppMetrics["topItems"] = [];
  const recent: AppMetrics["recent"] = [];

  for (const r of records) {
    counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    const d = (r.data ?? {}) as Record<string, unknown>;
    const key = amountKey(r.kind);
    const val = key ? Number(d[key] ?? 0) || 0 : 0;

    if (r.kind === "invoices") {
      const status = String(d.status ?? "");
      if (status === "paid") revenue += val;
      else if (status === "overdue") { overdue += val; outstanding += val; }
      else if (status !== "void" && status !== "draft") outstanding += val;
    } else if (REVENUE_KINDS.has(r.kind)) {
      revenue += val;
      if (val > 0) topItems.push({ label: labelOf(d), amount: val });
    } else if (EXPENSE_KINDS.has(r.kind)) {
      expenses += val;
    }

    if (r.kind === "products" || r.kind === "inventory" || r.kind === "medicines" || r.kind === "menu") {
      const stockRaw = d.stock ?? d.quantity ?? d.qty ?? d.stock_qty ?? d.on_hand;
      const hasStock = stockRaw !== undefined && stockRaw !== null && stockRaw !== "";
      if (hasStock) {
        const stock = Number(stockRaw) || 0;
        const cost = Number(d.cost ?? d.cost_price ?? d.price ?? 0) || 0;
        inventoryValue += stock * cost;
        const threshold = Number(d.low_stock ?? d.reorder_level ?? d.threshold ?? 5) || 5;
        if (stock <= threshold) lowStock.push({ label: labelOf(d), stock, threshold });
      }
    }

    // Configuration rows are not business activity.
    if (r.kind !== "settings") recent.push({ kind: r.kind, label: labelOf(d), when: r.created_at });

  }

  recent.sort((a, b) => b.when.localeCompare(a.when));
  topItems.sort((a, b) => b.amount - a.amount);

  return {
    revenue,
    expenses,
    profit: revenue - expenses,
    outstanding,
    overdue,
    inventoryValue,
    lowStock: lowStock.slice(0, 8),
    counts,
    topItems: topItems.slice(0, 6),
    recent: recent.slice(0, 10),
    total: records.length,
  };
}
