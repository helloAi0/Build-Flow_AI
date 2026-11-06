import { createFileRoute, Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/appRuntime";
import { submitSiteRequest } from "@/lib/storefront.functions";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/site/$id/cart")({
  component: SiteCart,
});

function SiteCart() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const navigate = useNavigate();
  const cart = useCart(site.projectId);
  const submit = useServerFn(submitSiteRequest);
  const currency = site.settings.currency;

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [done, setDone] = useState(false);

  const place = useMutation({
    mutationFn: () =>
      submit({
        data: {
          projectId: site.projectId,
          kind: "orders",
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim() || undefined,
          items: cart.lines.map((l) => ({ label: l.label, qty: l.qty, price: l.price })),
        },
      }),
    onSuccess: () => {
      cart.clear();
      setDone(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (done) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="font-display text-3xl">Order received</h1>
        <p className="mt-3 text-muted-foreground">
          Thank you, {form.name.split(" ")[0] || "friend"}. {site.name} has your order and will contact you at {form.email} to confirm.
        </p>
        <Link
          to="/site/$id/catalog"
          params={{ id: site.projectId }}
          className="mt-8 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-5 font-display text-2xl">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add something you like and it will show up here.</p>
        <button
          type="button"
          onClick={() => navigate({ to: "/site/$id/catalog", params: { id: site.projectId }, search: {} })}
          className="mt-7 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          Browse {site.catalogTitle.toLowerCase()}
        </button>
      </main>
    );
  }

  const valid = form.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="font-display text-3xl">Your cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.label}</p>
                <p className="text-sm text-muted-foreground">
                  {l.price > 0 ? formatMoney(l.price, currency) : "Price on request"}
                </p>
              </div>
              <div className="flex items-center rounded-full border border-border">
                <button type="button" aria-label={`Decrease ${l.label}`} className="grid h-9 w-9 place-items-center" onClick={() => cart.setQty(l.id, l.qty - 1)}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-7 text-center text-sm">{l.qty}</span>
                <button type="button" aria-label={`Increase ${l.label}`} className="grid h-9 w-9 place-items-center" onClick={() => cart.setQty(l.id, l.qty + 1)}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="w-24 text-right text-sm">{formatMoney(l.price * l.qty, currency)}</p>
              <button type="button" aria-label={`Remove ${l.label}`} className="text-muted-foreground hover:text-destructive" onClick={() => cart.remove(l.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <form
          className="space-y-3 rounded-2xl border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) { toast.error("Please add your name and a valid email."); return; }
            place.mutate();
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Items</span>
            <span>{cart.count}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3 text-base font-medium">
            <span>Total</span>
            <span>{formatMoney(cart.total, currency)}</span>
          </div>

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
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes (optional)</span>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <button
            type="submit"
            disabled={place.isPending}
            className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-85 disabled:opacity-50"
          >
            {place.isPending ? "Placing order..." : "Place order"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            {site.name} will confirm availability and payment with you directly.
          </p>
        </form>
      </div>
    </main>
  );
}
