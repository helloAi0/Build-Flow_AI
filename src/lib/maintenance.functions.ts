import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { MODULE_CATALOG, ALL_MODULE_KINDS, type ModuleKind } from "@/lib/modules";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * MAINTENANCE LAYER for generated applications.
 *
 * ANALYZE -> PLAN -> MODIFY -> VALIDATE (regression) -> APPLY (or roll back).
 * The assistant never returns advice: it returns a concrete change plan that is
 * applied to the live application, tested, and reverted automatically when the
 * existing workflows stop working.
 */

type AnySb = { from: (t: string) => any; rpc: (...a: unknown[]) => unknown };

const KIND_VALUES = ALL_MODULE_KINDS as [ModuleKind, ...ModuleKind[]];
const KindSchema = z.enum(KIND_VALUES);

const FIELD_TYPES = ["text", "textarea", "number", "date", "datetime", "select", "tags", "boolean", "url"] as const;
const SETTING_KEYS = [
  "businessName", "logoText", "tagline", "email", "phone", "address",
  "currency", "timezone", "language", "notifications",
] as const;

// Flat shape on purpose: union schemas are unreliable with structured output.
const ActionSchema = z.object({
  type: z.enum(["add_page", "remove_page", "rename_page", "add_field", "remove_field", "update_setting", "publish_site"]),
  /** page kind, for page and field actions */
  kind: KindSchema.optional(),
  /** page title, for add_page / rename_page */
  title: z.string().optional(),
  /** field key, for add_field / remove_field */
  key: z.string().optional(),
  label: z.string().optional(),
  fieldType: z.enum(FIELD_TYPES).optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  /** setting name, for update_setting */
  setting: z.enum(SETTING_KEYS).optional(),
  /** value for update_setting ("true"/"false" for publish_site) */
  value: z.string().optional(),
});

export type ChangeAction = z.infer<typeof ActionSchema>;

/** Drops actions that lack the information their type needs. */
function usableAction(a: ChangeAction): boolean {
  switch (a.type) {
    case "add_page":
    case "remove_page":
      return !!a.kind;
    case "rename_page":
      return !!a.kind && !!a.title;
    case "add_field":
      return !!a.kind && !!a.key && !!a.label && !!a.fieldType;
    case "remove_field":
      return !!a.kind && !!a.key;
    case "update_setting":
      return !!a.setting && a.value !== undefined;
    case "publish_site":
      return a.value === "true" || a.value === "false";
    default:
      return false;
  }
}

// Descriptive parts are defaulted: a plan is still applicable when the model
// leaves out a summary line, and the request should not fail for that.
const PlanOutput = z.object({
  understood: z.string().default(""),
  supported: z.boolean().default(true),
  unsupportedReason: z.string().optional(),
  affects: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  actions: z.array(ActionSchema).default([]),
  reply: z.string().default(""),
});

export type ChangePlan = z.infer<typeof PlanOutput>;

/* ---------------- helpers ---------------- */

async function enforceLimit(sb: AnySb, userId: string) {
  const month = new Date();
  month.setUTCDate(1);
  month.setUTCHours(0, 0, 0, 0);
  const periodMonth = month.toISOString().slice(0, 10);
  const [{ data: sub }, { data: counter }] = await Promise.all([
    sb.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle(),
    sb.from("usage_counters").select("generations").eq("user_id", userId).eq("period_month", periodMonth).maybeSingle(),
  ]);
  const plan = (sub?.plan as PlanId) ?? "free";
  const def = PLANS[plan] ?? PLANS.free;
  const used = counter?.generations ?? 0;
  if (def.generations >= 0 && used >= def.generations) {
    throw new Error(
      `PLAN_LIMIT: You've used all ${def.generations} AI changes on the ${def.name} plan this month. Upgrade for more.`,
    );
  }
}

async function requireOwner(sb: AnySb, projectId: string, userId: string) {
  const { data: project } = await sb
    .from("projects")
    .select("id, user_id, name, description, status, is_public, updated_at, created_at")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.user_id !== userId) throw new Error("Application not found");
  return project as {
    id: string; name: string; description: string | null; status: string;
    is_public: boolean; updated_at: string; created_at: string;
  };
}

function catalogPrompt(): string {
  return Object.values(MODULE_CATALOG)
    .filter((m) => !m.virtual)
    .map((m) => `- ${m.kind}: ${m.label} — Fields: ${m.fields.map((f) => f.key).join(", ")}.`)
    .join("\n");
}

/** Recovers a JSON object from a model answer that may be wrapped in prose. */
function tryParseJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n");
  const candidates = [raw, cleaned];
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(cleaned.slice(first, last + 1));
  for (const c of candidates) {
    try { return JSON.parse(c.trim()); } catch { /* try the next shape */ }
    try { return JSON.parse(c.replace(/,\s*([}\]])/g, "$1").trim()); } catch { /* keep going */ }
  }
  return null;
}

/**
 * Accepts the shapes models actually return (a wrapped object, or a flat array
 * mixing actions with the plan text) and reshapes them into a plan object.
 */
function normalizePlanShape(raw: unknown): unknown {
  const fixAction = (a: Record<string, unknown>) => {
    const out = { ...a };
    if (!out["type"] && typeof out["action"] === "string") out["type"] = out["action"];
    delete out["action"];
    return out;
  };
  if (Array.isArray(raw)) {
    const items = raw.filter((i): i is Record<string, unknown> => !!i && typeof i === "object");
    const meta = items.find((i) => "reply" in i || "steps" in i || "supported" in i) ?? {};
    const actions = items.filter((i) => "type" in i || "action" in i).map(fixAction);
    return { ...meta, actions: [...((meta["actions"] as unknown[]) ?? []), ...actions] };
  }
  if (raw && typeof raw === "object") {
    const obj = { ...(raw as Record<string, unknown>) };
    const actions = Array.isArray(obj["actions"]) ? (obj["actions"] as unknown[]) : [];
    obj["actions"] = actions
      .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
      .map(fixAction);
    return obj;
  }
  return raw;
}

function slugKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

/* ---------------- 1. ANALYZE + PLAN (no writes) ---------------- */

const PlanInput = z.object({
  projectId: z.string().uuid(),
  instruction: z.string().min(1).max(600),
});

export const planAppChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured for this workspace.");
    const sb = context.supabase as unknown as AnySb;
    const project = await requireOwner(sb, data.projectId, context.userId);
    await enforceLimit(sb, context.userId);

    const { fieldsOf } = await import("@/lib/maintenance.server");

    const { data: modules } = await sb
      .from("project_modules")
      .select("kind, title, config")
      .eq("project_id", data.projectId)
      .order("position");
    const mods = (modules ?? []) as Array<{ kind: string; title: string; config: Record<string, unknown> }>;
    const { data: counts } = await sb.from("module_records").select("kind").eq("project_id", data.projectId);

    const tally: Record<string, number> = {};
    for (const r of (counts ?? []) as Array<{ kind: string }>) tally[r.kind] = (tally[r.kind] ?? 0) + 1;

    const settingsCfg = (mods.find((m) => m.kind === "settings")?.config ?? {}) as Record<string, unknown>;

    const describeApp = [
      `Application: "${project.name}" — ${project.description ?? "no description"}`,
      `Customer-facing website published: ${project.is_public ? "yes" : "no"}`,
      `Configuration: ${JSON.stringify(settingsCfg)}`,
      "Pages (route, title, fields, saved records):",
      ...mods.map(
        (m) =>
          `- ${m.kind} ("${m.title}") fields: ${fieldsOf(m.kind, m.config ?? {}).map((f) => f.key).join(", ") || "none"} — ${tally[m.kind] ?? 0} records`,
      ),
    ].join("\n");

    const system = [
      "You are the BuildFlow application engineer. You maintain an ALREADY GENERATED business application.",
      "You never give advice or recommendations: you return a concrete change plan made of ACTIONS that the platform applies to the live application.",
      "",
      "Available page kinds you may add:",
      catalogPrompt(),
      "",
      "Action types: add_page, remove_page, rename_page, add_field, remove_field, update_setting, publish_site.",
      "Rules:",
      "- Prefer the smallest set of actions that fully satisfies the request. Never remove a page or field unless the user asked for it.",
      "- Field keys must be lower_snake_case. Use add_field for things like discount, colour, size, loyalty points, cancellation reason, WhatsApp number.",
      "- Every action is one flat object. Fill only the properties that action needs: kind+title for pages, kind+key+label+fieldType for fields, setting+value for update_setting, value=\"true\"/\"false\" for publish_site.",
      `- update_setting 'setting' must be one of: ${SETTING_KEYS.join(", ")}. Currency values are 3-letter codes (INR, USD...).`,
      "- Turning the customer-facing website on or off is publish_site.",
      "- 'affects' lists the parts of the application that change (schema, form, list, dashboard, workflows, website...). 'steps' is the ordered plan in plain language.",
      "- If the request truly cannot be expressed with these actions, set supported=false and explain plainly in unsupportedReason. Never pretend a change was made.",
      "- Never invent real-world facts (doctor schedules, hospital details, phone numbers, addresses, prices). Only structure.",
      "- 'reply' is one or two friendly sentences for a non-technical business owner.",
      "- Include ONLY actions the user explicitly asked for. Never add update_setting or publish_site actions unless the request is about settings or publishing.",
      "Return ONE JSON object exactly in this shape (no arrays at the top level, no extra keys):",
      '{"reply":"...","supported":true,"affects":["form"],"steps":["..."],"actions":[{"type":"add_field","kind":"products","key":"discount","label":"Discount %","fieldType":"number"}]}',
    ].join("\n");

    const gateway = createLovableAiGatewayProvider(key);
    let plan: ChangePlan;
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: `${describeApp}\n\nUser request: ${data.instruction}`,
        experimental_output: Output.object({ schema: PlanOutput }),
      });
      plan = PlanOutput.parse(normalizePlanShape(experimental_output)) as ChangePlan;
    } catch (err) {
      // The gateway does not enforce schemas for every model, so recover the
      // JSON from the raw answer instead of failing the user's request.
      const raw = NoObjectGeneratedError.isInstance(err) ? (err.text ?? "") : "";
      const parsed = raw ? tryParseJson(raw) : null;
      const result = parsed ? PlanOutput.safeParse(normalizePlanShape(parsed)) : null;
      if (!result?.success) {
        console.error("[buildflow] plan parse failed", String(err), JSON.stringify(result?.error?.issues ?? null));
        throw new Error("I couldn't work out a safe change for that. Try describing it in a different way.");
      }
      plan = result.data as ChangePlan;
    }
    // Normalise field keys so applied actions stay database-safe, and drop
    // anything the model returned without the details needed to apply it.
    plan.actions = (plan.actions ?? [])
      .map((a) => (a.key ? { ...a, key: slugKey(a.key) } : a))
      .filter(usableAction);
    if (!plan.understood) plan.understood = data.instruction;
    if (!plan.steps.length) plan.steps = plan.actions.map((a) => `${a.type.replace(/_/g, " ")} ${a.label ?? a.title ?? a.setting ?? a.kind ?? ""}`.trim());
    if (plan.supported && plan.actions.length === 0) {
      plan.supported = false;
      plan.unsupportedReason =
        plan.unsupportedReason ||
        "This request needs functionality the application builder does not support yet, so nothing was changed.";
    }
    return plan;
  });

/* ---------------- 2. MODIFY + VALIDATE + APPLY ---------------- */

const ApplyInput = z.object({
  projectId: z.string().uuid(),
  instruction: z.string().min(1).max(600),
  plan: PlanOutput,
});

export const applyAppChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApplyInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as AnySb;
    await requireOwner(sb, data.projectId, context.userId);
    if (!data.plan.supported || data.plan.actions.length === 0) {
      throw new Error("This change plan has nothing that can be applied.");
    }

    const { saveVersion, loadSnapshot, restoreSnapshot, runRegression, logEvent, customFieldsOf, hiddenFieldsOf } =
      await import("@/lib/maintenance.server");

    // Baseline snapshot so a failed change can be reverted exactly.
    const before = await loadSnapshot(sb, data.projectId);
    if (!before) throw new Error("Application not found");

    const applied: string[] = [];

    const reloadModules = async () => {
      const { data: rows } = await sb
        .from("project_modules")
        .select("id, kind, title, config, position")
        .eq("project_id", data.projectId)
        .order("position");
      return (rows ?? []) as Array<{ id: string; kind: string; title: string; config: Record<string, unknown>; position: number }>;
    };

    for (const action of data.plan.actions) {
      if (!usableAction(action)) continue;
      const mods = await reloadModules();
      const existing = action.kind ? mods.find((m) => m.kind === action.kind) : undefined;
      const settingsMod = mods.find((m) => m.kind === "settings");

      if (action.type === "add_page") {
        if (existing) continue;
        const def = MODULE_CATALOG[action.kind as ModuleKind];
        if (!def) continue;
        const position = settingsMod ? settingsMod.position : (mods.at(-1)?.position ?? -1) + 1;
        if (settingsMod) await sb.from("project_modules").update({ position: position + 1 }).eq("id", settingsMod.id);
        await sb.from("project_modules").insert({
          project_id: data.projectId,
          kind: action.kind,
          title: action.title || def.label,
          config: def.defaultConfig as never,
          position,
        });
        applied.push(`Added the ${action.title || def.label} page`);
      } else if (action.type === "remove_page") {
        if (!existing) continue;
        await sb.from("module_records").delete().eq("module_id", existing.id);
        await sb.from("project_modules").delete().eq("id", existing.id);
        applied.push(`Removed the ${existing.title} page`);
      } else if (action.type === "rename_page") {
        if (!existing) continue;
        await sb.from("project_modules").update({ title: action.title }).eq("id", existing.id);
        applied.push(`Renamed ${existing.title} to ${action.title}`);
      } else if (action.type === "add_field") {
        if (!existing) continue;
        const fieldKey = action.key as string;
        const cfg = { ...(existing.config ?? {}) };
        const def = MODULE_CATALOG[action.kind as ModuleKind];
        const custom = customFieldsOf(cfg);
        const hidden = hiddenFieldsOf(cfg).filter((k) => k !== fieldKey);
        const alreadyBase = (def?.fields ?? []).some((f) => f.key === fieldKey);
        if (!alreadyBase && !custom.some((f) => f.key === fieldKey)) {
          custom.push({
            key: fieldKey,
            label: action.label as string,
            type: action.fieldType as NonNullable<ChangeAction["fieldType"]>,
            ...(action.options?.length ? { options: action.options } : {}),
            ...(action.required ? { required: true } : {}),
          });
        }
        cfg["customFields"] = custom as never;
        cfg["hiddenFields"] = hidden as never;
        await sb.from("project_modules").update({ config: cfg as never }).eq("id", existing.id);
        applied.push(`Added "${action.label}" to ${existing.title}`);
      } else if (action.type === "remove_field") {
        if (!existing) continue;
        const fieldKey = action.key as string;
        const cfg = { ...(existing.config ?? {}) };
        cfg["customFields"] = customFieldsOf(cfg).filter((f) => f.key !== fieldKey) as never;
        cfg["hiddenFields"] = Array.from(new Set([...hiddenFieldsOf(cfg), fieldKey])) as never;
        await sb.from("project_modules").update({ config: cfg as never }).eq("id", existing.id);
        applied.push(`Removed "${fieldKey}" from ${existing.title}`);
      } else if (action.type === "update_setting") {
        const settingKey = action.setting as string;
        const value: unknown = settingKey === "notifications" ? action.value === "true" : action.value;
        if (settingsMod) {
          const cfg = { ...(settingsMod.config ?? {}), [settingKey]: value };
          await sb.from("project_modules").update({ config: cfg as never }).eq("id", settingsMod.id);
        } else {
          await sb.from("project_modules").insert({
            project_id: data.projectId,
            kind: "settings",
            title: "Settings",
            config: { [settingKey]: value } as never,
            position: (mods.at(-1)?.position ?? -1) + 1,
          });
        }
        applied.push(`Set ${settingKey} to ${action.value}`);
      } else if (action.type === "publish_site") {
        const on = action.value === "true";
        await sb.from("projects").update({ is_public: on }).eq("id", data.projectId);
        applied.push(on ? "Published the customer website" : "Unpublished the customer website");
      }
    }

    // VALIDATE: existing workflows must still pass.
    const regression = await runRegression(sb, data.projectId, context.userId);

    if (!regression.ok) {
      await restoreSnapshot(sb, data.projectId, before);
      const failed = regression.checks.filter((c) => !c.ok);
      await logEvent(sb, {
        projectId: data.projectId,
        userId: context.userId,
        kind: "ai_change_reverted",
        level: "error",
        message: `Change reverted: "${data.instruction}"`,
        details: { failed, applied },
      });
      await sb.rpc("increment_generation_usage", { _user_id: context.userId });
      return {
        applied: false as const,
        version: null as number | null,
        changes: applied,
        checks: regression.checks,
        reply: `I reverted the change because these existing workflows stopped working: ${failed
          .map((c) => c.name)
          .join(", ")}. Your application is exactly as it was.`,
      };
    }

    // APPLY: keep it, record a version we can roll back to.
    const version = await saveVersion(sb, {
      projectId: data.projectId,
      userId: context.userId,
      label: data.plan.understood.slice(0, 120) || data.instruction.slice(0, 120),
      summary: applied.join("; "),
    });
    await sb.from("projects").update({ status: "ready" }).eq("id", data.projectId);
    await logEvent(sb, {
      projectId: data.projectId,
      userId: context.userId,
      kind: "ai_change_applied",
      level: "info",
      message: `Version ${version}: ${data.plan.understood.slice(0, 160)}`,
      details: { applied, instruction: data.instruction },
    });
    await sb.rpc("increment_generation_usage", { _user_id: context.userId });

    return {
      applied: true as const,
      version,
      changes: applied,
      checks: regression.checks,
      reply: data.plan.reply,
    };
  });

/* ---------------- 3. HEALTH ---------------- */

export const getAppHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as AnySb;
    const project = await requireOwner(sb, data.projectId, context.userId);
    const { runRegression, logEvent } = await import("@/lib/maintenance.server");

    await sb.from("projects").update({ status: "validating" }).eq("id", data.projectId);
    const { ok, checks } = await runRegression(sb, data.projectId, context.userId);
    await sb.from("projects").update({ status: ok ? "ready" : "failed" }).eq("id", data.projectId);

    await logEvent(sb, {
      projectId: data.projectId,
      userId: context.userId,
      kind: "health_check",
      level: ok ? "info" : "error",
      message: ok ? "All application checks passed" : `${checks.filter((c) => !c.ok).length} check(s) failed`,
      details: { checks },
    });

    const { data: versions } = await sb
      .from("project_versions")
      .select("version")
      .eq("project_id", data.projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      status: ok ? ("ready" as const) : ("failed" as const),
      checks,
      project: {
        id: project.id,
        name: project.name,
        isPublic: project.is_public,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      },
      version: versions?.version ?? 1,
    };
  });

/* ---------------- 4. VERSIONS + ROLLBACK ---------------- */

export const listAppVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as AnySb;
    await requireOwner(sb, data.projectId, context.userId);
    const { data: rows } = await sb
      .from("project_versions")
      .select("id, version, label, summary, created_at")
      .eq("project_id", data.projectId)
      .order("version", { ascending: false });
    return (rows ?? []) as Array<{
      id: string; version: number; label: string; summary: string | null; created_at: string;
    }>;
  });

export const rollbackAppVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid(), version: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as AnySb;
    await requireOwner(sb, data.projectId, context.userId);
    const { restoreSnapshot, saveVersion, runRegression, logEvent } = await import("@/lib/maintenance.server");

    const { data: row } = await sb
      .from("project_versions")
      .select("version, label, snapshot")
      .eq("project_id", data.projectId)
      .eq("version", data.version)
      .maybeSingle();
    if (!row) throw new Error("That version no longer exists");

    // Keep the current state recoverable before rolling back.
    await saveVersion(sb, {
      projectId: data.projectId,
      userId: context.userId,
      label: `Before rollback to version ${data.version}`,
    });

    await restoreSnapshot(sb, data.projectId, row.snapshot as Parameters<typeof restoreSnapshot>[2]);
    const { ok, checks } = await runRegression(sb, data.projectId, context.userId);
    await sb.from("projects").update({ status: ok ? "ready" : "failed" }).eq("id", data.projectId);

    await logEvent(sb, {
      projectId: data.projectId,
      userId: context.userId,
      kind: "rollback",
      level: ok ? "info" : "warning",
      message: `Rolled back to version ${data.version} (${row.label})`,
      details: { checks },
    });

    return { ok, checks, version: data.version };
  });

/* ---------------- 5. LOGS ---------------- */

export const listAppEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as AnySb;
    await requireOwner(sb, data.projectId, context.userId);
    const { data: rows } = await sb
      .from("project_events")
      .select("id, kind, level, message, created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (rows ?? []) as Array<{
      id: string; kind: string; level: string; message: string; created_at: string;
    }>;
  });
