import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { submitSiteRequest } from "@/lib/storefront.functions";

export const Route = createFileRoute("/site/$id/contact")({
  component: SiteContact,
});

function SiteContact() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const submit = useServerFn(submitSiteRequest);
  const needsSchedule = site.requestKind === "reservations" || site.requestKind === "bookings";

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", date: "", people: "2" });
  const [done, setDone] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      submit({
        data: {
          projectId: site.projectId,
          kind: site.requestKind,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
          date: needsSchedule && form.date ? form.date : undefined,
          people: needsSchedule ? Math.max(1, Number(form.people) || 1) : undefined,
        },
      }),
    onSuccess: () => setDone(true),
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = form.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  return (
    <main className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="font-display text-3xl sm:text-4xl">{site.requestLabel}</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Send your details to {site.name} and we'll get back to you as soon as possible.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        {done ? (
          <div className="rounded-2xl border border-border p-10 text-center">
            <h2 className="font-display text-2xl">Request sent</h2>
            <p className="mt-3 text-muted-foreground">
              Thank you, {form.name.split(" ")[0] || "friend"}. We'll reply to {form.email} shortly.
            </p>
            <Link
              to="/site/$id"
              params={{ id: site.projectId }}
              className="mt-7 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4 rounded-2xl border border-border p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) { toast.error("Please add your name and a valid email."); return; }
              send.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">Your name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Phone (optional)</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              {needsSchedule ? (
                <>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Preferred date &amp; time</span>
                    <input
                      type="datetime-local"
                      value={form.date}
                      onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">People</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={form.people}
                      onChange={(e) => setForm((s) => ({ ...s, people: e.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                </>
              ) : null}
            </div>
            <label className="block text-sm">
              <span className="text-muted-foreground">How can we help?</span>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <button
              type="submit"
              disabled={send.isPending}
              className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition hover:opacity-85 disabled:opacity-50"
            >
              {send.isPending ? "Sending..." : site.requestLabel}
            </button>
          </form>
        )}

        <aside className="space-y-4 text-sm">
          {site.settings.address ? (
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="whitespace-pre-line">{site.settings.address}</p>
            </div>
          ) : null}
          {site.settings.phone ? (
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={`tel:${site.settings.phone}`} className="hover:underline">{site.settings.phone}</a>
            </div>
          ) : null}
          {site.settings.email ? (
            <div className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={`mailto:${site.settings.email}`} className="hover:underline">{site.settings.email}</a>
            </div>
          ) : null}
          {site.settings.address ? (
            <a
              className="inline-block underline text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.settings.address)}`}
            >
              Open in maps
            </a>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
