import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MODULE_CATALOG, type ModuleKind } from "@/lib/modules";

export function AddModuleDialog({
  open, onOpenChange, existing, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing: string[];
  onPick: (kind: ModuleKind) => void;
}) {
  const items = Object.values(MODULE_CATALOG);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Add module</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((m) => {
            const has = existing.includes(m.kind);
            const Icon = m.icon;
            return (
              <button
                key={m.kind}
                disabled={has}
                onClick={() => { onPick(m.kind); onOpenChange(false); }}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-gradient">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{m.label} {has && <span className="ml-1 text-xs text-muted-foreground">(added)</span>}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
