import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { setSiteVisibility, updateAppSettings } from "@/lib/runtime.functions";
import { CURRENCIES, type AppDefinition, type AppSettings } from "@/lib/appRuntime";

const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"];
const LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" }, { code: "es", label: "Spanish" },
  { code: "fr", label: "French" }, { code: "de", label: "German" }, { code: "ar", label: "Arabic" }, { code: "pt", label: "Portuguese" },
];

export function RuntimeSettings({ app, title, onSaved }: { app: AppDefinition; title: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const publish = useServerFn(setSiteVisibility);
  const [isPublic, setIsPublic] = useState(app.isPublic);
  const siteUrl = typeof window === "undefined" ? "" : `${window.location.origin}/site/${app.projectId}`;

  const publishMut = useMutation({
    mutationFn: (next: boolean) => publish({ data: { projectId: app.projectId, isPublic: next } }),
    onSuccess: (res) => {
      setIsPublic(res.isPublic);
      toast.success(res.isPublic ? "Your customer website is live" : "Customer website switched off");
      qc.invalidateQueries({ queryKey: ["workspace", app.projectId] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [form, setForm] = useState<AppSettings>({ ...app.settings, businessName: app.settings.businessName || app.name });
  const save = useServerFn(updateAppSettings);

  const mut = useMutation({
    mutationFn: () => save({ data: { projectId: app.projectId, settings: form } }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["workspace", app.projectId] });
      onSaved();
    },
    onError: (e: Error) => toast.error(`Could not save settings: ${e.message}`),
  });

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-xl sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Branding, contact details, and regional preferences for this application.</p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-base">Business</h2>
        <div>
          <Label>Business name</Label>
          <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
          <div>
            <Label>Logo initials</Label>
            <Input maxLength={3} value={form.logoText} onChange={(e) => set("logoText", e.target.value.toUpperCase())} placeholder={app.initials} />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-base">Customer website</h2>
        <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
          <div>
            <Label className="!mb-0">Publish a public website for customers</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitors can browse your catalog and send orders, bookings or enquiries — they never see your private data.
            </p>
          </div>
          <Switch
            checked={isPublic}
            disabled={publishMut.isPending}
            onCheckedChange={(v) => publishMut.mutate(v)}
            aria-label="Publish customer website"
          />
        </div>
        {isPublic ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={siteUrl} className="max-w-sm" aria-label="Website address" />
            <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(siteUrl); toast.success("Link copied"); }}>
              Copy link
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={siteUrl} target="_blank" rel="noreferrer">Open website</a>
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-base">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
        <div><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-base">Regional</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Currency</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Timezone</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.language} onChange={(e) => set("language", e.target.value)}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <Label className="!mb-0">In-app alerts (low stock, overdue payments)</Label>
          <Switch checked={form.notifications} onCheckedChange={(v) => set("notifications", v)} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-brand-gradient text-white">
          {mut.isPending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
