import { createFileRoute, Link, useLoaderData, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { ItemCard, Money, categoryOf, descOf, imageOf, inStock, priceOf, titleOf } from "@/components/site/parts";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/site/$id/item/$rid")({
  component: SiteItem,
});

const HIDDEN_KEYS = /^(id|image|image_url|photo|cover|thumbnail|picture|description|summary|details|notes|content|excerpt|name|title|product|item|price|amount|created_via|source|__.*)$/i;

function SiteItem() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const { rid } = useParams({ from: "/site/$id/item/$rid" });
  const cart = useCart(site.projectId);
  const [qty, setQty] = useState(1);

  const record = site.catalog.find((r) => r.id === rid);

  if (!record) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl">This item is no longer listed</h1>
        <Link
          to="/site/$id/catalog"
          params={{ id: site.projectId }}
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          Back to {site.catalogTitle.toLowerCase()}
        </Link>
      </main>
    );
  }

  const image = imageOf(record);
  const price = priceOf(record);
  const available = inStock(record);
  const related = site.catalog.filter((r) => r.id !== record.id && categoryOf(r) === categoryOf(record)).slice(0, 3);

  const details = Object.entries(record.data)
    .filter(([k, v]) => !HIDDEN_KEYS.test(k) && v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link
        to="/site/$id/catalog"
        params={{ id: site.projectId }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {site.catalogTitle.toLowerCase()}
      </Link>

      <div className="mt-7 grid gap-10 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
          {image ? (
            <img src={image} alt={titleOf(record)} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl font-semibold text-primary/30">
              {titleOf(record).slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div>
          {categoryOf(record) ? (
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{categoryOf(record)}</p>
          ) : null}
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">{titleOf(record)}</h1>
          <p className="mt-4 text-2xl"><Money value={price} currency={site.settings.currency} /></p>
          {descOf(record) ? <p className="mt-5 whitespace-pre-line text-muted-foreground">{descOf(record)}</p> : null}

          <p className={`mt-5 text-sm ${available ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            {available ? "Available now" : "Currently sold out"}
          </p>

          {site.canOrder ? (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border">
                <button type="button" aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button type="button" aria-label="Increase quantity" className="grid h-10 w-10 place-items-center" onClick={() => setQty((n) => Math.min(99, n + 1))}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                disabled={!available}
                onClick={() => {
                  cart.add({ id: record.id, label: titleOf(record), price }, qty);
                  toast.success(`${titleOf(record)} added to your cart`);
                }}
                className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition hover:opacity-85 disabled:opacity-40"
              >
                Add to cart
              </button>
              <Link
                to="/site/$id/cart"
                params={{ id: site.projectId }}
                className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:bg-muted"
              >
                View cart
              </Link>
            </div>
          ) : (
            <Link
              to="/site/$id/contact"
              params={{ id: site.projectId }}
              className="mt-7 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background"
            >
              {site.requestLabel}
            </Link>
          )}

          {details.length > 0 ? (
            <dl className="mt-9 grid gap-x-6 gap-y-3 border-t border-border pt-6 text-sm sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 sm:block">
                  <dt className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                  <dd className="sm:mt-0.5">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20">
          <h2 className="font-display text-2xl">You may also like</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ItemCard key={r.id} projectId={site.projectId} record={r} currency={site.settings.currency} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
