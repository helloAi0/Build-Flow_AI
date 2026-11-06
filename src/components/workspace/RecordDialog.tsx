import { useEffect, useId, useRef, useState } from "react";
import { type ModuleField } from "@/lib/modules";
import { resolveModuleDef } from "@/lib/appRuntime";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: string;
  /** module config, so assistant-added fields appear on the form */
  config?: unknown;
  initial?: Record<string, unknown> | null;
  /** field key -> existing values from related modules (customers, products, ...) */
  suggestions?: Record<string, string[]>;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
};

export function RecordDialog({ open, onOpenChange, kind, config, initial, suggestions, onSubmit }: Props) {
  const def = resolveModuleDef(kind, config);
  const [values, setValues] = useState<Record<string, unknown>>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Only reset when the dialog opens — never while the user is typing
  // (parent data refetches change `initial`'s identity constantly).
  const openedRef = useRef(open);
  useEffect(() => {
    if (open && !openedRef.current) {
      setValues(initial ? { ...initial } : {});
      setErrors({});
    }
    openedRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  const key = open ? "open" : "closed";

  if (!def) return null;


  const set = (k: string, v: unknown) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of def.fields) {
      const v = values[f.key];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (f.required && empty) { next[f.key] = `${f.label} is required`; continue; }
      if (empty) continue;
      if (f.type === "number" && isNaN(Number(v))) next[f.key] = "Must be a number";
      else if (f.type === "url" && !/^https?:\/\/\S+$/i.test(String(v))) next[f.key] = "Must be a valid URL";
      else if (f.key.toLowerCase().includes("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) next[f.key] = "Must be a valid email";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // The caller reports the failure; keep the form open with the user's input
      // so nothing typed is lost and Save can be retried.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) { setValues(initial ?? {}); setErrors({}); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} {def.label.replace(/s$/, "")}</DialogTitle></DialogHeader>
        <div key={key} className="space-y-3">
          {def.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              options={suggestions?.[f.key]}
              error={errors[f.key]}
              onChange={(v) => set(f.key, v)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-brand-gradient text-white">
            {busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({ field, value, options, error, onChange }: { field: ModuleField; value: unknown; options?: string[]; error?: string; onChange: (v: unknown) => void }) {
  const v = value;
  const uid = useId();
  const inputId = `${uid}-input`;
  const errorId = error ? `${uid}-error` : undefined;
  const describedBy = errorId ?? (options && options.length > 0 ? `${uid}-hint` : undefined);
  const listId = options && options.length > 0 ? `${uid}-sug` : undefined;
  const common = {
    id: inputId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };
  switch (field.type) {
    case "textarea":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Textarea {...common} value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.placeholder} />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    case "number":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Input {...common} type="number" value={(v as number) ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    case "date":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Input {...common} type="date" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    case "datetime":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Input {...common} type="datetime-local" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    case "select":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Select value={(v as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger {...common} aria-describedby={describedBy}><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{field.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    case "tags": {
      const tags = Array.isArray(v) ? (v as string[]) : ((v as string) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div><Label htmlFor={inputId}>{field.label} <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
          <Input {...common} value={tags.join(", ")} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    }
    case "boolean":
      return (
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <Label htmlFor={inputId} className="!mb-0">{field.label}</Label>
          <Switch id={inputId} checked={!!v} onCheckedChange={onChange} />
        </div>
      );
    case "url":
      return (
        <div><Label htmlFor={inputId}>{field.label}</Label>
          <Input {...common} type="url" value={(v as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
    default:
      return (
        <div><Label htmlFor={inputId}>{field.label}{field.required && " *"}</Label>
          <Input
            {...common}
            value={(v as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            list={listId}
          />
          {listId ? (
            <datalist id={listId}>
              {options!.map((o) => <option key={o} value={o} />)}
            </datalist>
          ) : null}
          {listId && !error ? (
            <p id={describedBy} className="mt-1 text-xs text-muted-foreground">Linked to your existing records — pick one or type a new value.</p>
          ) : null}
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      );
  }
}

function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-1 text-xs text-destructive">{children}</p>;
}
