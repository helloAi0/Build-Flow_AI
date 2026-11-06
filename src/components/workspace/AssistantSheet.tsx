import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Send, Check, X, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { planAppChange, applyAppChange, type ChangePlan } from "@/lib/maintenance.functions";
import { toast } from "sonner";

type Msg =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "result"; text: string; ok: boolean; changes: string[]; failed: string[] };

/**
 * The maintenance assistant: it understands the existing application, proposes
 * a concrete change plan, applies it, tests it, and reverts on failure.
 */
export function AssistantSheet({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ instruction: string; plan: ChangePlan } | null>(null);
  const qc = useQueryClient();
  const planFn = useServerFn(planAppChange);
  const applyFn = useServerFn(applyAppChange);

  const showError = (e: Error) => {
    const msg = e.message || "";
    if (msg.includes("PLAN_LIMIT")) toast.error(msg.replace(/^Error:\s*PLAN_LIMIT:\s*/, ""));
    else toast.error(msg || "The assistant could not complete that. Please try again.");
  };

  const plan = useMutation({
    mutationFn: (instruction: string) => planFn({ data: { projectId, instruction } }),
    onSuccess: (res, instruction) => {
      setMessages((m) => [...m, { role: "assistant", text: res.understood }]);
      if (res.supported && res.actions.length > 0) setPending({ instruction, plan: res });
      else
        setMessages((m) => [
          ...m,
          { role: "assistant", text: res.unsupportedReason || "I can't make that change yet, so nothing was changed." },
        ]);
    },
    onError: showError,
  });

  const apply = useMutation({
    mutationFn: () => applyFn({ data: { projectId, instruction: pending!.instruction, plan: pending!.plan } }),
    onSuccess: (res) => {
      setPending(null);
      setMessages((m) => [
        ...m,
        {
          role: "result",
          ok: res.applied,
          text: res.reply,
          changes: res.changes,
          failed: res.checks.filter((c) => !c.ok).map((c) => c.name),
        },
      ]);
      qc.invalidateQueries({ queryKey: ["workspace", projectId] });
      qc.invalidateQueries({ queryKey: ["app-records", projectId] });
      qc.invalidateQueries({ queryKey: ["app-versions", projectId] });
      qc.invalidateQueries({ queryKey: ["app-events", projectId] });
      qc.invalidateQueries({ queryKey: ["usage"] });
      if (res.applied) toast.success(`Change applied and tested (version ${res.version})`);
      else toast.error("Change reverted — your application is unchanged");
    },
    onError: showError,
  });

  const busy = plan.isPending || apply.isPending;

  const send = () => {
    const text = input.trim();
    if (!text || busy || pending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    plan.mutate(text);
  };

  const suggestions = [
    "Add a discount field to products",
    "Change the currency to INR",
    "Add employee management",
    "Add customer loyalty points",
    "Add a WhatsApp number to customers",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 && !pending ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Describe the change you want. I'll show you exactly what will change, apply it, and test your application
              before keeping it.
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m, i) =>
            m.role === "result" ? (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${m.ok ? "border-primary/30 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {m.ok ? <Check className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {m.ok ? "Applied and tested" : "Reverted"}
                </div>
                <p className="mt-1 text-muted-foreground">{m.text}</p>
                {m.changes.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {m.changes.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                )}
                {m.failed.length > 0 && (
                  <p className="mt-2 text-xs text-destructive">Failed checks: {m.failed.join(", ")}</p>
                )}
              </div>
            ) : (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-brand-gradient text-white" : "bg-muted"}`}
                >
                  {m.text}
                </div>
              </div>
            ),
          )}

          {pending && (
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              <p className="font-medium">Here's my plan</p>
              <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
                {pending.plan.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              {pending.plan.affects.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Affects: {pending.plan.affects.join(", ")}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Your current version is saved first, and the change is undone automatically if anything breaks.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => apply.mutate()} disabled={apply.isPending} className="bg-brand-gradient text-white">
                  {apply.isPending ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Applying &amp; testing</> : "Apply this change"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={apply.isPending}>
                  <X className="mr-1.5 h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {plan.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Reading your application...
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-border pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Add a discount field to products..."
            aria-label="Describe the change you want"
            disabled={busy || !!pending}
          />
          <Button onClick={send} disabled={busy || !!pending || !input.trim()} className="bg-brand-gradient text-white">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
