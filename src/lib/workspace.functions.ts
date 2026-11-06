import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALL_MODULE_KINDS, MODULE_CATALOG, type ModuleKind } from "./modules";
import { detectAppType } from "./appTypes";
import { generateSeedRecords, repairRecord } from "./seed";

import { PLANS, type PlanId } from "./plans";

const KIND_VALUES = ALL_MODULE_KINDS as [ModuleKind, ...ModuleKind[]];
const KindSchema = z.enum(KIND_VALUES);

// LOOSE schema for AI structured output — no min/max bounds (they cause
// AI_NoObjectGeneratedError on otherwise successful gateway calls). We
// validate and repair the result in code below.
const AiBlueprintSchema = z.object({
  name: z.string().optional(),
  summary: z.string().optional(),
  modules: z.array(z.record(z.string(), z.any())),
  nextSteps: z.array(z.string()).optional(),
});

/** Normalize an AI module item that may use alternate keys
 *  (`module`/`type` for kind, `data`/`records`/`seed` for seedRecords, `name`/`label` for title). */
function normalizeModuleItem(m: Record<string, unknown>): { kind: string; title?: string; config?: Record<string, unknown>; seedRecords?: Record<string, unknown>[] } {
  const kind = String((m.kind ?? m.module ?? m.type ?? m.key ?? "") as string).trim();
  const title = (m.title ?? m.name ?? m.label) as string | undefined;
  const config = (m.config ?? m.settings) as Record<string, unknown> | undefined;
  const seedRaw = (m.seedRecords ?? m.data ?? m.records ?? m.seed ?? m.rows ?? m.items) as unknown;
  const seedRecords = Array.isArray(seedRaw)
    ? (seedRaw.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as Record<string, unknown>[])
    : undefined;
  return { kind, title, config, seedRecords };
}


// STRICT schema for the client → createProjectFromBlueprint boundary.
const BlueprintSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  modules: z.array(z.object({
    kind: KindSchema,
    title: z.string().min(1),
    config: z.record(z.string(), z.any()).optional(),
    seedRecords: z.array(z.record(z.string(), z.any())).optional(),
  })).min(1),
  nextSteps: z.array(z.string()).default([]),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

/* ---------------- Structured pipeline error ---------------- */

type PipelineErrorPayload = {
  code: string;
  step: string;
  message: string;
  details?: unknown;
  aiResponse?: string;
  stack?: string;
};

function pipelineError(payload: PipelineErrorPayload): Error {
  const err = new Error(`PIPELINE:${JSON.stringify(payload)}`);
  return err;
}

function classifyError(step: string, err: unknown): Error {
  const raw = err instanceof Error ? err : new Error(String(err));
  const msg = raw.message || "";
  let code = "UNKNOWN";
  if (msg.includes("PLAN_LIMIT")) code = "PLAN_LIMIT";
  else if (msg.includes("PIPELINE:")) return raw; // already classified
  else if (msg.includes("Missing LOVABLE_API_KEY")) code = "MISSING_API_KEY";
  else if (/\b401\b|unauthori[sz]ed|invalid api key/i.test(msg)) code = "INVALID_API_KEY";
  else if (/\b402\b|credit/i.test(msg)) code = "CREDITS_EXHAUSTED";
  else if (/\b429\b|rate.?limit/i.test(msg)) code = "RATE_LIMITED";
  else if (/\b5\d\d\b|timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg)) code = "NETWORK";
  else if (/JSON|parse/i.test(msg)) code = "JSON_PARSE";
  else if (/schema|validation|NoObjectGenerated/i.test(msg)) code = "AI_SCHEMA";
  else if (/permission|row.?level|policy|violates|duplicate key|constraint/i.test(msg)) code = "DATABASE";
  return pipelineError({ code, step, message: msg, stack: raw.stack });
}

/* ---------------- Utils ---------------- */

async function enforceLimit(supabase: ReturnType<typeof getSb>, userId: string) {
  const month = new Date();
  month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const periodMonth = month.toISOString().slice(0, 10);
  const [{ data: sub }, { data: counter }] = await Promise.all([
    (supabase as unknown as { from: (t: string) => any }).from("subscriptions").select("plan").eq("user_id", userId).maybeSingle(),
    (supabase as unknown as { from: (t: string) => any }).from("usage_counters").select("generations").eq("user_id", userId).eq("period_month", periodMonth).maybeSingle(),
  ]);
  const plan = (sub?.plan as PlanId) ?? "free";
  const def = PLANS[plan] ?? PLANS.free;
  const used = counter?.generations ?? 0;
  if (def.generations >= 0 && used >= def.generations) {
    throw new Error(`PLAN_LIMIT: You've used all ${def.generations} generations on the ${def.name} plan this month. Upgrade for more.`);
  }
}
type Sb = { rpc: (...a: unknown[]) => unknown };
function getSb(x: Sb) { return x; }

function catalogPrompt(): string {
  return Object.values(MODULE_CATALOG)
    .filter((m) => !m.virtual)
    .map((m) => `- ${m.kind}: ${m.label} — ${m.description} Fields: ${m.fields.map((f) => f.key).join(", ")}.`)
    .join("\n");
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/** Robust JSON extractor — strips fences, finds boundaries, repairs trailing commas / control chars. */
function extractJSON(raw: string): unknown {
  let cleaned = String(raw ?? "")
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/```\s*$/im, "")
    .trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const objStart = cleaned.indexOf("{");
    const arrStart = cleaned.indexOf("[");
    const isArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);
    const start = isArray ? arrStart : objStart;
    const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object/array found in AI response");
    cleaned = cleaned.slice(start, end + 1);
  }
  try { return JSON.parse(cleaned); } catch {
    const repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    return JSON.parse(repaired);
  }
}

/** Some models wrap structured output under a wrapper key
 *  (e.g. `{ output: {...} }`, `{ response: {...} }`, `{ data: {...} }`).
 *  Unwrap up to 3 levels until we find an object with `modules` or `name`. */
function unwrapBlueprintShape(input: unknown): unknown {
  let cur = input;
  for (let i = 0; i < 4; i++) {
    // Root-level array: [{ name, summary, modules }] → unwrap to first element
    if (Array.isArray(cur)) {
      if (cur.length === 0) return cur;
      if (cur.length > 1) {
        console.warn(`[buildflow] AI returned ${cur.length} blueprints; using the first`);
      }
      cur = cur[0];
      continue;
    }
    if (!cur || typeof cur !== "object") return cur;
    const rec = cur as Record<string, unknown>;
    if ("modules" in rec || "name" in rec) return rec;
    const known = ["output", "response", "data", "result", "blueprint", "blueprints", "value", "json", "object", "items"];
    let next: unknown = null;
    for (const k of known) {
      const v = rec[k];
      if (v && typeof v === "object") { next = v; break; }
    }
    if (!next) {
      const keys = Object.keys(rec);
      if (keys.length === 1 && rec[keys[0]] && typeof rec[keys[0]] === "object") next = rec[keys[0]];
    }
    if (!next) return cur;
    cur = next;
  }
  return cur;
}


/** Validate + repair AI output into a strict Blueprint. Never throws unless nothing salvageable. */
function repairBlueprint(input: unknown, prompt: string): Blueprint {
  const unwrapped = unwrapBlueprintShape(input);
  const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  console.log("[buildflow] repairBlueprint snapshot:", JSON.stringify({
    inputType: typeof input,
    inputKeys: isObj(input) ? Object.keys(input).slice(0, 20) : null,
    unwrappedKeys: isObj(unwrapped) ? Object.keys(unwrapped).slice(0, 20) : null,
    hasModules: isObj(unwrapped) && "modules" in unwrapped,
    modulesLen: Array.isArray((unwrapped as { modules?: unknown })?.modules)
      ? ((unwrapped as { modules: unknown[] }).modules.length) : null,
    expectedKeys: Object.keys(AiBlueprintSchema.shape),
    rawPreview: JSON.stringify(input).slice(0, 600),
  }));

  // Some AI replies list modules as plain names ("leads") with seed rows under top-level keys.
  if (isObj(unwrapped) && Array.isArray(unwrapped.modules)) {
    const src = unwrapped;
    src.modules = (src.modules as unknown[]).map((m) =>
      typeof m === "string" ? { kind: m, ...(Array.isArray(src[m]) ? { seedRecords: src[m] } : {}) } : m,
    );
  }
  const parsed = AiBlueprintSchema.safeParse(unwrapped);
  if (!parsed.success) {
    throw pipelineError({
      code: "AI_SCHEMA",
      step: "validate_blueprint",
      message: "AI response missing required top-level shape",
      details: parsed.error.flatten(),
      aiResponse: JSON.stringify(input).slice(0, 4000),
    });
  }
  const raw = parsed.data;
  const validKinds = new Set(ALL_MODULE_KINDS);

  // Repair modules: normalize alternate keys, drop unknown kinds, ensure titles, dedupe by kind.
  const seen = new Set<string>();
  const modules: Blueprint["modules"] = [];
  for (const rawItem of raw.modules ?? []) {
    const m = normalizeModuleItem(rawItem as Record<string, unknown>);
    if (!m.kind || !validKinds.has(m.kind as ModuleKind)) {
      console.warn(`[buildflow] dropping unknown module kind: ${m.kind}`);
      continue;
    }
    if (seen.has(m.kind)) continue;
    seen.add(m.kind);
    const def = MODULE_CATALOG[m.kind as ModuleKind];
    modules.push({
      kind: m.kind as ModuleKind,
      title: (m.title && m.title.trim()) || def.label,
      config: m.config,
      seedRecords: Array.isArray(m.seedRecords) ? m.seedRecords.slice(0, 20) : [],
    });
  }

  // Template completion: union in every module of the matched verified app
  // template so the generated app is never missing a core screen.
  const appType = detectAppType(prompt);
  if (appType) {
    console.log(`[buildflow] matched app template: ${appType.id}`);
    for (const kind of appType.modules) {
      if (seen.has(kind)) continue;
      seen.add(kind);
      const def = MODULE_CATALOG[kind];
      if (!def) continue;
      modules.push({ kind, title: def.label, seedRecords: [] });
    }
  }

  // Guarantee every non-virtual module ships with usable starter data.
  for (const m of modules) {
    const def = MODULE_CATALOG[m.kind];
    if (!def || def.virtual) { m.seedRecords = []; continue; }
    const rows = (m.seedRecords ?? []).map((r, i) => repairRecord(m.kind, r, i));
    m.seedRecords = rows.length >= 3 ? rows : [...rows, ...generateSeedRecords(m.kind, 8 - rows.length)];
  }




  // Ensure dashboard first, settings last.
  const reordered: Blueprint["modules"] = [];
  const dash = modules.find((m) => m.kind === "dashboard");
  if (!dash) reordered.push({ kind: "dashboard", title: "Dashboard", seedRecords: [] });
  else reordered.push(dash);
  for (const m of modules) if (m.kind !== "dashboard" && m.kind !== "settings") reordered.push(m);
  const settings = modules.find((m) => m.kind === "settings");
  reordered.push(settings ?? { kind: "settings", title: "Settings", seedRecords: [] });

  if (reordered.length < 2) {
    throw pipelineError({
      code: "AI_SCHEMA",
      step: "validate_blueprint",
      message: `AI returned no valid modules (got ${raw.modules?.length ?? 0} raw, 0 valid)`,
      aiResponse: JSON.stringify(input).slice(0, 2000),
    });
  }

  const blueprint: Blueprint = {
    name: (raw.name || "").trim() || `Workspace for ${prompt.slice(0, 40)}`,
    summary: (raw.summary || "").trim() || prompt,
    modules: reordered,
    nextSteps: (raw.nextSteps ?? []).filter((s) => typeof s === "string" && s.trim().length > 0),
  };

  const strict = BlueprintSchema.safeParse(blueprint);
  if (!strict.success) {
    throw pipelineError({
      code: "AI_SCHEMA",
      step: "final_validate",
      message: "Blueprint failed strict validation after repair",
      details: strict.error.flatten(),
      aiResponse: JSON.stringify(blueprint).slice(0, 2000),
    });
  }
  return strict.data;
}

/* ---------------- Generate Blueprint ---------------- */

const GenerateInput = z.object({ prompt: z.string().min(3).max(2000) });

async function callAiWithRetry(key: string, prompt: string): Promise<unknown> {
  const gateway = createLovableAiGatewayProvider(key);
  const system = `You are BuildFlow AI, an APPLICATION BUILDER. The user describes a business; you build a COMPLETE, WORKING application by selecting modules from this catalog and pre-populating them with realistic seed data. Module catalog:\n\n${catalogPrompt()}\n\nRules:\n- Pick 5-9 modules that together form a COMPLETE product for the described business.\n- ALWAYS include "dashboard" as the FIRST module and "settings" as the LAST module. Include "reports" or "analytics" when it fits.\n- For every non-virtual module, generate 6-10 REALISTIC seed records with the EXACT field keys from the catalog. Numbers must be plain numbers (no currency symbols). Use ISO dates (YYYY-MM-DD). Data must be internally consistent.\n- "name" is a short product name (2-6 words). "summary" is one plain paragraph.\n- Return JSON matching the schema. No prose outside the JSON.`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      console.log(`[buildflow] AI attempt ${attempt}/3, promptLen=${prompt.length}`);
      const { experimental_output, text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
        experimental_output: Output.object({ schema: AiBlueprintSchema }),
      });
      const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
      console.log(`[buildflow] AI ok in ${Date.now() - t0}ms, textLen=${text?.length ?? 0}, outputType=${typeof experimental_output}, outputKeys=${isObj(experimental_output) ? Object.keys(experimental_output).slice(0, 20).join(",") : "(n/a)"}`);
      console.log(`[buildflow] AI raw text preview: ${String(text ?? "").slice(0, 400)}`);

      // If experimental_output somehow lacks `modules` but the raw text has it,
      // prefer parsing the raw text — some providers wrap or drop the object.
      const outHasModules = isObj(experimental_output) && "modules" in experimental_output;
      if (!outHasModules && text) {
        try {
          const fromText = extractJSON(text);
          const isObjT = fromText && typeof fromText === "object" && !Array.isArray(fromText);
          if (isObjT) {
            console.log(`[buildflow] using raw text JSON (experimental_output missing modules)`);
            return fromText;
          }
        } catch (e) {
          console.warn("[buildflow] raw text JSON fallback failed:", e);
        }
      }
      return experimental_output;
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[buildflow] AI attempt ${attempt} failed: ${msg}`);

      // Try to recover from schema-mismatch by parsing raw text.
      if (NoObjectGeneratedError.isInstance(err) && err.text) {
        try {
          const parsed = extractJSON(err.text);
          console.log(`[buildflow] recovered blueprint from raw text (attempt ${attempt})`);
          return parsed;
        } catch (jsonErr) {
          console.error(`[buildflow] JSON recovery failed:`, jsonErr);
        }
      }

      // Only retry transient errors.
      const retryable = /\b429\b|\b5\d\d\b|timeout|ETIMEDOUT|ECONNRESET|fetch failed|network/i.test(msg);
      if (!retryable || attempt === 3) break;
      const backoff = 500 * Math.pow(2, attempt - 1);
      console.log(`[buildflow] backing off ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw classifyError("ai_request", lastErr);
}

export const generateBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GenerateInput.parse(data))
  .handler(async ({ data, context }): Promise<Blueprint> => {
    console.log(`[buildflow] generateBlueprint start user=${context.userId} promptLen=${data.prompt.length}`);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw pipelineError({ code: "MISSING_API_KEY", step: "boot", message: "LOVABLE_API_KEY not configured on server" });

    try { await enforceLimit(context.supabase as unknown as Sb, context.userId); }
    catch (e) { throw classifyError("plan_limit", e); }

    const aiOutput = await callAiWithRetry(key, data.prompt);
    console.log(`[buildflow] AI output keys=${Object.keys((aiOutput as object) ?? {}).join(",")}`);

    const blueprint = repairBlueprint(aiOutput, data.prompt);
    console.log(`[buildflow] blueprint ok: ${blueprint.modules.length} modules`);

    try {
      await (context.supabase as unknown as Sb).rpc("increment_generation_usage", { _user_id: context.userId });
    } catch (e) {
      console.error("[buildflow] usage increment failed (non-fatal):", e);
    }
    return blueprint;
  });

/* ---------------- Create Workspace from Blueprint ---------------- */

const CreateInput = z.object({
  prompt: z.string().min(1),
  blueprint: BlueprintSchema,
});

export const createProjectFromBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }): Promise<{ projectId: string; warnings: string[] }> => {
    const warnings: string[] = [];
    const sb = context.supabase;
    console.log(`[buildflow] createProject user=${context.userId} name="${data.blueprint.name}" modules=${data.blueprint.modules.length}`);

    let project: { id: string } | null = null;
    try {
      const res = await sb.from("projects").insert({
        user_id: context.userId,
        name: data.blueprint.name,
        description: data.blueprint.summary,
        prompt: data.prompt,
      }).select("id").single();
      if (res.error || !res.data) throw new Error(res.error?.message ?? "no row returned");
      project = res.data as { id: string };
    } catch (e) {
      throw classifyError("db_insert_project", e);
    }

    try {
      await sb.from("generated_solutions").insert({
        user_id: context.userId,
        project_id: project.id,
        prompt: data.prompt,
        solutions: data.blueprint as never,
      });
    } catch (e) {
      console.error("[buildflow] history insert failed (non-fatal):", e);
      warnings.push("history_insert_failed");
    }

    for (let i = 0; i < data.blueprint.modules.length; i++) {
      const m = data.blueprint.modules[i];
      const def = MODULE_CATALOG[m.kind];
      if (!def) { warnings.push(`skip_unknown_${m.kind}`); continue; }
      try {
        const { data: mod, error: mErr } = await sb.from("project_modules").insert({
          project_id: project.id,
          kind: m.kind,
          title: m.title || def.label,
          config: ({ ...def.defaultConfig, ...(m.config ?? {}) }) as never,
          position: i,
        }).select("id").single();
        if (mErr || !mod) throw new Error(mErr?.message ?? "module insert returned no row");

        if (!def.virtual && m.seedRecords && m.seedRecords.length) {
          const rows = m.seedRecords.map((r) => ({
            module_id: mod.id, project_id: project!.id, kind: m.kind, data: r as never,
          }));
          const { error: rErr } = await sb.from("module_records").insert(rows);
          if (rErr) {
            console.error(`[buildflow] seed insert failed for ${m.kind}:`, rErr.message);
            warnings.push(`seed_failed_${m.kind}`);
          }
        }
      } catch (e) {
        console.error(`[buildflow] module ${m.kind} failed:`, e);
        warnings.push(`module_failed_${m.kind}`);
      }
    }

    console.log(`[buildflow] project ${project.id} created, warnings=${warnings.length}`);
    return { projectId: project.id, warnings };
  });

/* ---------------- Module operations ---------------- */

export const listWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle();
    const { data: modules = [] } = await context.supabase.from("project_modules").select("*").eq("project_id", data.projectId).order("position", { ascending: true });
    return { project, modules: modules ?? [] };
  });

export const addModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    kind: KindSchema,
    title: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const def = MODULE_CATALOG[data.kind];
    const { data: last } = await context.supabase.from("project_modules")
      .select("position").eq("project_id", data.projectId)
      .order("position", { ascending: false }).limit(1).maybeSingle();
    const position = (last?.position ?? -1) + 1;
    const { data: mod, error } = await context.supabase.from("project_modules").insert({
      project_id: data.projectId, kind: data.kind,
      title: data.title || def.label, config: def.defaultConfig as never, position,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mod;
  });

export const removeModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ moduleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_modules").delete().eq("id", data.moduleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ moduleId: z.string().uuid(), title: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("project_modules").update({ title: data.title }).eq("id", data.moduleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- AI Assistant edit ---------------- */

const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_module"), kind: KindSchema, title: z.string().optional() }),
  z.object({ type: z.literal("remove_module"), kind: KindSchema }),
  z.object({ type: z.literal("rename_module"), kind: KindSchema, title: z.string() }),
]);
const AssistantOutput = z.object({
  reply: z.string().min(1).max(600),
  actions: z.array(ActionSchema).max(6),
});

const AssistantInput = z.object({ projectId: z.string().uuid(), instruction: z.string().min(1).max(600) });

export const assistantEditProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AssistantInput.parse(d))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    await enforceLimit(context.supabase as unknown as Sb, context.userId);

    const { data: project } = await context.supabase.from("projects").select("name, description").eq("id", data.projectId).maybeSingle();
    const { data: modules = [] } = await context.supabase.from("project_modules").select("kind, title").eq("project_id", data.projectId);

    const gateway = createLovableAiGatewayProvider(key);
    const system = `You are the BuildFlow AI Assistant. You modify a user's business workspace by returning ACTIONS chosen from this catalog:\n\n${catalogPrompt()}\n\nAllowed action types: add_module, remove_module, rename_module. Only pick module kinds from the catalog. Prefer fewer, precise actions. If the request is not about modules, return an empty actions array and just reply. Always include a short user-facing reply.`;
    const userMsg = `Current project: "${project?.name}"\nCurrent modules: ${(modules ?? []).map((m) => `${m.kind} ("${m.title}")`).join(", ") || "(none)"}\n\nUser instruction: ${data.instruction}`;

    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system, prompt: userMsg,
      experimental_output: Output.object({ schema: AssistantOutput }),
    });

    // Apply actions
    const existing = new Map((modules ?? []).map((m) => [m.kind as string, m]));
    for (const a of experimental_output.actions) {
      if (a.type === "add_module") {
        if (existing.has(a.kind)) continue;
        const def = MODULE_CATALOG[a.kind];
        const { data: last } = await context.supabase.from("project_modules")
          .select("position").eq("project_id", data.projectId)
          .order("position", { ascending: false }).limit(1).maybeSingle();
        const position = (last?.position ?? -1) + 1;
        await context.supabase.from("project_modules").insert({
          project_id: data.projectId, kind: a.kind,
          title: a.title || def.label, config: def.defaultConfig as never, position,
        });
      } else if (a.type === "remove_module") {
        await context.supabase.from("project_modules").delete().eq("project_id", data.projectId).eq("kind", a.kind);
      } else if (a.type === "rename_module") {
        await context.supabase.from("project_modules").update({ title: a.title }).eq("project_id", data.projectId).eq("kind", a.kind);
      }
    }

    await (context.supabase as unknown as Sb).rpc("increment_generation_usage", { _user_id: context.userId });
    return experimental_output;
  });

/* ---------------- Records CRUD ---------------- */

export const listRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ moduleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows = [] } = await context.supabase.from("module_records")
      .select("*").eq("module_id", data.moduleId).order("created_at", { ascending: false });
    return rows ?? [];
  });

export const upsertRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    moduleId: z.string().uuid(),
    projectId: z.string().uuid(),
    kind: z.string(),
    data: z.record(z.string(), z.any()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("module_records").update({ data: data.data as never }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase.from("module_records").insert({
      module_id: data.moduleId, project_id: data.projectId, kind: data.kind, data: data.data as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("module_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Export ---------------- */

export const exportProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: project }, { data: modules = [] }, { data: records = [] }] = await Promise.all([
      context.supabase.from("projects").select("*").eq("id", data.projectId).maybeSingle(),
      context.supabase.from("project_modules").select("*").eq("project_id", data.projectId).order("position"),
      context.supabase.from("module_records").select("*").eq("project_id", data.projectId),
    ]);
    return { project, modules: modules ?? [], records: records ?? [], exportedAt: new Date().toISOString() };
  });
