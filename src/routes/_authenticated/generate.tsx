import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wand2, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateBlueprint, createProjectFromBlueprint } from "@/lib/workspace.functions";

const SAMPLES = [
  "I need a Bill Manager for my agency.",
  "I need a CRM for a B2B software startup.",
  "I need Inventory Management for a warehouse.",
  "I need an Appointment Booking app for a salon.",
  "I need a Restaurant Management System.",
  "I run a clothing shop and need everything to run it.",
];

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({ meta: [{ title: "Build an app — BuildFlow AI" }] }),
  component: Generate,
});

function Generate() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const generate = useServerFn(generateBlueprint);
  const create = useServerFn(createProjectFromBlueprint);

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "designing" | "provisioning">("idle");
  const [failure, setFailure] = useState<null | {
    step: string; code: string; message: string; details?: unknown; aiResponse?: string; stack?: string; raw: string;
  }>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pre = sessionStorage.getItem("buildflow.prefill");
    if (pre) { setPrompt(pre); sessionStorage.removeItem("buildflow.prefill"); }
  }, []);

  const buildMut = useMutation({
    mutationFn: async (p: string) => {
      setFailure(null);
      setPhase("designing");
      const blueprint = await generate({ data: { prompt: p } });
      setPhase("provisioning");
      const res = await create({ data: { prompt: p, blueprint } });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Your application is ready");
      navigate({ to: "/run/$id", params: { id: res.projectId } });
    },
    onError: (e: Error) => {
      setPhase("idle");
      const raw = e.message || String(e);
      // Parse structured pipeline error
      const m = raw.match(/PIPELINE:(\{.*\})\s*$/s);
      let parsed: { code: string; step: string; message: string; details?: unknown; aiResponse?: string; stack?: string } | null = null;
      if (m) { try { parsed = JSON.parse(m[1]); } catch { /* ignore */ } }

      if (parsed?.code === "PLAN_LIMIT" || raw.includes("PLAN_LIMIT")) {
        toast.error(parsed?.message ?? raw.replace(/^.*PLAN_LIMIT:\s*/, ""), {
          action: { label: "Upgrade", onClick: () => { window.location.href = "/pricing"; } },
        });
        return;
      }
      const friendlyByCode: Record<string, string> = {
        MISSING_API_KEY: "Server is missing the AI API key. Contact support.",
        INVALID_API_KEY: "Invalid AI API key. Contact support.",
        CREDITS_EXHAUSTED: "AI credits exhausted. Please upgrade your plan.",
        RATE_LIMITED: "Rate limit reached. Please retry in a moment.",
        NETWORK: "Network/timeout error reaching the AI provider. Please retry.",
        JSON_PARSE: "AI returned malformed JSON. Please retry.",
        AI_SCHEMA: "AI response didn't match the expected shape. Please retry.",
        DATABASE: "Database error while saving your project.",
        UNKNOWN: "Something went wrong. See details below.",
      };
      const friendly = parsed ? friendlyByCode[parsed.code] ?? parsed.message : "Generation failed. See details below.";
      toast.error(friendly);
      setFailure({
        step: parsed?.step ?? "unknown",
        code: parsed?.code ?? "UNKNOWN",
        message: parsed?.message ?? raw,
        details: parsed?.details,
        aiResponse: parsed?.aiResponse,
        stack: parsed?.stack,
        raw,
      });
      console.error("[buildflow] generation failed:", parsed ?? raw);
    },
  });

  const busy = phase !== "idle";

  return (
    <div className="space-y-8">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl sm:text-3xl">Build an app</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Describe your business in one line. BuildFlow AI generates a complete, working application — real modules, real forms, real data.
        </p>
      </div>

      <Card className="p-6">
        <Label className="text-sm font-medium">What do you need?</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. I need a Bill Manager for my agency."
          rows={4}
          className="mt-2"
          disabled={busy}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                disabled={busy}
                className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
              >{s}</button>
            ))}
          </div>
          <Button
            onClick={() => buildMut.mutate(prompt)}
            disabled={busy || !prompt.trim()}
            className="bg-brand-gradient text-white hover:opacity-95"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {phase === "designing" ? "Designing your app..." : phase === "provisioning" ? "Provisioning workspace..." : "Build my app"}
          </Button>
        </div>
      </Card>

      {busy ? (
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h3 className="mt-4 font-display text-lg">
            {phase === "designing" ? "Designing your application..." : "Provisioning modules, forms, and seed data..."}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            You'll be dropped straight into a fully working workspace in a moment.
          </p>
        </Card>
      ) : failure ? (
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h3 className="font-display text-lg">Generation failed</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono rounded bg-muted px-1.5 py-0.5 text-xs">{failure.code}</span>{" "}
                  at step <span className="font-mono">{failure.step}</span>
                </p>
              </div>
              <div className="rounded-md border bg-background p-3 text-sm">
                <div className="text-xs font-medium text-muted-foreground">Error message</div>
                <div className="mt-1 break-words">{failure.message}</div>
              </div>
              {failure.details ? (
                <details className="rounded-md border bg-background p-3 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Validation details</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {JSON.stringify(failure.details, null, 2)}
                  </pre>
                </details>
              ) : null}
              {failure.aiResponse ? (
                <details className="rounded-md border bg-background p-3 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">AI response (truncated)</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {failure.aiResponse}
                  </pre>
                </details>
              ) : null}
              {failure.stack ? (
                <details className="rounded-md border bg-background p-3 text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Stack trace</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {failure.stack}
                  </pre>
                </details>
              ) : null}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setFailure(null)}>Dismiss</Button>
                <Button size="sm" onClick={() => buildMut.mutate(prompt)} disabled={!prompt.trim()}>Retry</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed bg-muted/30 p-10 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient"><Wand2 className="h-6 w-6 text-white" /></div>
          <h3 className="font-display text-lg">Type what you need. Get a working app.</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            No mockups, no blueprints — real modules with dashboards, CRUD, search and starter data, ready to use.
          </p>
        </Card>
      )}
    </div>
  );
}
