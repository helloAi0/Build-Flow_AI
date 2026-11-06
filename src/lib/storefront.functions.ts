import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/appRuntime";

/**
 * Public storefront data for a generated application's customer-facing website.
 * Reads run through the publishable (anon) key, so Row Level Security decides
 * what a visitor may see: only projects whose website is switched on, and only
 * catalog/content records — never customers, invoices, payments or staff.
 */

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type SitePage = { slug: string; title: string; content: string };

export type SiteValue = string | number | boolean | null | string[];
export type SiteRecord = { id: string; kind: string; data: Record<string, SiteValue> };

export type PublicSite = {
  projectId: string;
  name: string;
  tagline: string;
  initials: string;
  settings: AppSettings;
  catalogKind: string | null;
  catalogTitle: string;
  catalog: SiteRecord[];
  reviews: SiteRecord[];
  pages: SitePage[];
  requestKind: "orders" | "reservations" | "bookings" | "leads";
  requestLabel: string;
  canOrder: boolean;
};

const CATALOG_PRIORITY = ["products", "menu", "portfolio", "courses", "plans", "properties", "rooms", "vehicles", "events", "blog"];
const CATALOG_TITLES: Record<string, string> = {
  products: "Products", menu: "Menu", portfolio: "Work", courses: "Courses", plans: "Plans",
  properties: "Properties", rooms: "Rooms", vehicles: "Fleet", events: "Events", blog: "Journal",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AP";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export const getPublicSite = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<PublicSite | null> => {
    const sb = publicClient();

    const { data: project } = await sb
      .from("projects")
      .select("id, name, description, is_public")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project || !project.is_public) return null;

    const { data: modules } = await sb
      .from("project_modules")
      .select("id, kind, title, config, position")
      .eq("project_id", data.projectId)
      .order("position");
    const mods = modules ?? [];

    const settingsCfg = (mods.find((m) => m.kind === "settings")?.config ?? {}) as Partial<AppSettings>;
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...settingsCfg };
    const name = settings.businessName?.trim() || project.name;

    const { data: records } = await sb
      .from("module_records")
      .select("id, kind, data")
      .eq("project_id", data.projectId);
    const rows = ((records ?? []) as unknown as SiteRecord[]).filter(
      (r) => !r.data?.["__validation"],
    );

    const kinds = new Set(mods.map((m) => m.kind));
    const catalogKind = CATALOG_PRIORITY.find((k) => kinds.has(k)) ?? null;
    const catalogModule = catalogKind ? mods.find((m) => m.kind === catalogKind) : undefined;

    const pages: SitePage[] = rows
      .filter((r) => r.kind === "website")
      .filter((r) => r.data["published"] !== false)
      .map((r) => ({
        slug: String(r.data["slug"] ?? "").replace(/^\/+/, "") || String(r.data["title"] ?? "page").toLowerCase(),
        title: String(r.data["title"] ?? "Page"),
        content: String(r.data["content"] ?? ""),
      }));

    const requestKind: PublicSite["requestKind"] =
      kinds.has("orders") ? "orders"
      : kinds.has("reservations") ? "reservations"
      : kinds.has("bookings") ? "bookings"
      : "leads";
    const requestLabel =
      requestKind === "orders" ? "Place order"
      : requestKind === "reservations" ? "Reserve a table"
      : requestKind === "bookings" ? "Book an appointment"
      : "Send enquiry";

    return {
      projectId: project.id,
      name,
      tagline: settings.tagline?.trim() || project.description || "",
      initials: (settings.logoText?.trim() || initialsOf(name)).slice(0, 3).toUpperCase(),
      settings,
      catalogKind,
      catalogTitle: catalogModule?.title || (catalogKind ? CATALOG_TITLES[catalogKind] ?? "Catalog" : "Catalog"),
      catalog: catalogKind ? rows.filter((r) => r.kind === catalogKind) : [],
      reviews: rows.filter((r) => r.kind === "reviews").slice(0, 6),
      pages,
      requestKind,
      requestLabel,
      canOrder: requestKind === "orders" && !!catalogKind,
    };
  });

const RequestSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["orders", "reservations", "bookings", "leads"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
  date: z.string().trim().max(40).optional(),
  people: z.number().int().min(1).max(200).optional(),
  items: z
    .array(z.object({ label: z.string().max(200), qty: z.number().int().min(1).max(999), price: z.number().min(0) }))
    .max(50)
    .optional(),
});

/** A website visitor submits an order / reservation / booking / enquiry. */
export const submitSiteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RequestSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();

    const { data: project } = await sb
      .from("projects")
      .select("id, is_public")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project || !project.is_public) throw new Error("This website is not accepting requests.");

    const { data: mod } = await sb
      .from("project_modules")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("kind", data.kind)
      .maybeSingle();
    if (!mod) throw new Error("This website is not accepting requests.");

    const items = data.items ?? [];
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    const summary = items.map((i) => `${i.qty} × ${i.label}`).join(", ");

    const payload: Record<string, unknown> = {
      customer: data.name,
      name: data.name,
      email: data.email,
      status: data.kind === "leads" ? "new" : "pending",
      source: "website",
      created_via: "website",
    };
    if (data.phone) payload["phone"] = data.phone;
    if (data.message) payload["notes"] = data.message;
    if (data.date) payload["date"] = data.date;
    if (data.people) payload["guests"] = data.people;
    if (items.length > 0) {
      payload["product"] = items[0]!.label;
      payload["items"] = summary;
      payload["quantity"] = items.reduce((s, i) => s + i.qty, 0);
      payload["total"] = total;
      payload["amount"] = total;
    }

    const { error } = await sb.from("module_records").insert({
      module_id: mod.id,
      project_id: data.projectId,
      kind: data.kind,
      data: payload as never,
    });
    if (error) throw new Error("We could not submit your request. Please try again.");
    return { ok: true, total };
  });
