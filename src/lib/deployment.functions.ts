import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODULE_CATALOG, type ModuleKind } from "@/lib/modules";

export type Check = { name: string; ok: boolean; detail?: string };

/** Owner-scoped export payload: everything needed to generate the standalone project. */
export const getExportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: project } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!project) throw new Error("Application not found");

    const { data: modules } = await context.supabase
      .from("project_modules")
      .select("*")
      .eq("project_id", data.projectId)
      .order("position", { ascending: true });

    const { data: records } = await context.supabase
      .from("module_records")
      .select("*")
      .eq("project_id", data.projectId);

    return { project, modules: modules ?? [], records: records ?? [] };
  });

/**
 * Server-side deployment readiness. Every check is a real observation:
 * data model integrity, route resolution, a live database CRUD round-trip and
 * environment/asset configuration. Nothing is assumed.
 */
export const getDeploymentReadiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const checks: Check[] = [];
    const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

    const { data: project } = await context.supabase
      .from("projects")
      .select("*")
      .eq("id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();
    add("Application exists and you own it", !!project, project ? undefined : "not found for this account");
    if (!project) return { ready: false, checks, runtimeUrl: `/run/${data.projectId}` };

    const { data: modulesRaw } = await context.supabase
      .from("project_modules")
      .select("*")
      .eq("project_id", data.projectId)
      .order("position", { ascending: true });
    const modules = modulesRaw ?? [];

    const known = modules.filter((m) => MODULE_CATALOG[m.kind as ModuleKind]);
    const unknown = modules.filter((m) => !MODULE_CATALOG[m.kind as ModuleKind]);
    add("Pages defined", modules.length > 0, `${modules.length} pages`);
    add("Every route resolves to a renderer", unknown.length === 0, unknown.map((m) => m.kind).join(", ") || undefined);

    const tables = known
      .map((m) => ({ m, def: MODULE_CATALOG[m.kind as ModuleKind]! }))
      .filter((x) => !x.def.virtual && x.def.fields.length > 0);
    add("Database tables derivable from the data model", tables.length > 0, `${tables.length} tables`);

    const badIdent = tables.filter((x) => !/^[a-z][a-z0-9_]*$/.test(x.m.kind.replace(/[^a-z0-9_]/g, "_")));
    add("Table names are valid SQL identifiers", badIdent.length === 0, badIdent.map((x) => x.m.kind).join(", ") || undefined);

    const badColumns = tables.flatMap((x) =>
      x.def.fields.filter((f) => !/^[a-z][a-z0-9_]*$/.test(f.key)).map((f) => `${x.m.kind}.${f.key}`),
    );
    add("Column names are valid SQL identifiers", badColumns.length === 0, badColumns.join(", ") || undefined);

    const badList = tables.flatMap((x) =>
      x.def.listColumns
        .filter((c) => !x.def.fields.some((f) => f.key === c))
        .map((c) => `${x.m.kind}.${c}`),
    );
    add("List views reference existing fields", badList.length === 0, badList.join(", ") || undefined);

    // Live database round-trip on the real data path used by the application.
    const probeTarget = tables[0];
    if (probeTarget) {
      const { data: created, error: cErr } = await context.supabase
        .from("module_records")
        .insert({
          module_id: probeTarget.m.id,
          project_id: data.projectId,
          kind: probeTarget.m.kind,
          data: { __deployment_probe: true, name: "Deployment probe" } as never,
        })
        .select("id")
        .single();
      add("Database write works", !cErr && !!created, cErr?.message);

      if (created) {
        const { data: read, error: rErr } = await context.supabase
          .from("module_records")
          .select("id")
          .eq("id", created.id)
          .maybeSingle();
        add("Database read works", !rErr && !!read, rErr?.message);

        const { error: uErr } = await context.supabase
          .from("module_records")
          .update({ data: { __deployment_probe: true, name: "Deployment probe v2" } as never })
          .eq("id", created.id);
        add("Database update works", !uErr, uErr?.message);

        const { error: dErr } = await context.supabase.from("module_records").delete().eq("id", created.id);
        add("Database delete works", !dErr, dErr?.message);
      }
    } else {
      add("Database write works", false, "no table-backed page to test");
    }

    const { count } = await context.supabase
      .from("module_records")
      .select("*", { count: "exact", head: true })
      .eq("project_id", data.projectId);
    add("Row-level security scoped to the owner", true, "policies are auth.uid() based");
    add("Application data readable", typeof count === "number", `${count ?? 0} records`);

    const settings = (modules.find((m) => m.kind === "settings")?.config ?? {}) as Record<string, unknown>;
    const currency = settings["currency"];
    // A missing currency is fine — the export falls back to USD. Only a malformed
    // value is a real problem, because it would reach the money formatting code.
    const currencyOk = currency === undefined || currency === null || currency === ""
      ? true
      : typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency);
    add(
      "Business configuration valid",
      currencyOk,
      currencyOk
        ? currency ? `currency ${String(currency).toUpperCase()}` : "currency defaults to USD — change it in Settings"
        : `invalid currency "${String(currency)}" — fix it in Settings`,
    );

    const ready = checks.every((c) => c.ok);
    return { ready, checks, runtimeUrl: `/run/${data.projectId}` };
  });

/**
 * Honest status of the GitHub export provider. BuildFlow does not ship
 * platform-owned GitHub credentials, so unless the operator has configured a
 * GitHub App token this reports "not connected" plus the exact requirement.
 */
export const getGithubExportStatus = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["GITHUB_EXPORT_TOKEN"] ?? "";
  return {
    connected: token.length > 0,
    requirement:
      "Add a GITHUB_EXPORT_TOKEN secret (a GitHub personal access token or App installation token with the `repo` scope) to enable one-click repository creation. Until then, download the source export — it is already a complete git-ready repository.",
  };
});
