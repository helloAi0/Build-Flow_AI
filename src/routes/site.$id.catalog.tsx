import { createFileRoute, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ItemCard, categoryOf, priceOf, titleOf } from "@/components/site/parts";
import { useCart } from "@/lib/cart";

type Search = { category?: string };

export const Route = createFileRoute("/site/$id/catalog")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    category: typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  component: SiteCatalog,
});

function SiteCatalog() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const { category } = Route.useSearch();
  const navigate = useNavigate();
  const cart = useCart(site.projectId);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "low" | "high">("default");

  const categories = useMemo(
    () => [...new Set(site.catalog.map(categoryOf).filter(Boolean))].sort(),
    [site.catalog],
  );

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = site.catalog.filter((r) => {
      if (category && categoryOf(r) !== category) return false;
      if (!s) return true;
      return `${titleOf(r)} ${categoryOf(r)}`.toLowerCase().includes(s);
    });
    if (sort !== "default") {
      list = [...list].sort((a, b) => (sort === "low" ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a)));
    }
    return list;
  }, [site.catalog, q, category, sort]);

  const setCategory = (value?: string) =>
    navigate({ to: "/site/$id/catalog", params: { id: site.projectId }, search: value ? { category: value } : {} });

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl sm:text-4xl">{site.catalogTitle}</h1>
      <p className="mt-2 text-muted-foreground">
        {site.catalog.length} {site.catalog.length === 1 ? "item" : "items"} available
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${site.catalogTitle.toLowerCase()}...`}
          aria-label={`Search ${site.catalogTitle}`}
          className="h-10 w-full max-w-xs rounded-full border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          aria-label="Sort"
          className="h-10 rounded-full border border-border bg-background px-4 text-sm"
        >
          <option value="default">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>

      {categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${!category ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${category === c ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      {site.catalog.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-border p-12 text-center">
          <h2 className="font-display text-xl">Nothing listed yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">New {site.catalogTitle.toLowerCase()} is on the way — check back soon.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 rounded-2xl border border-border p-12 text-center">
          <h2 className="font-display text-xl">No matches</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or category.</p>
          <button
            type="button"
            onClick={() => { setQ(""); setCategory(undefined); }}
            className="mt-5 rounded-full border border-border px-5 py-2 text-sm hover:bg-muted"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <ItemCard
              key={r.id}
              projectId={site.projectId}
              record={r}
              currency={site.settings.currency}
              onAdd={
                site.canOrder
                  ? (rec) => {
                      cart.add({ id: rec.id, label: titleOf(rec), price: priceOf(rec) });
                      toast.success(`${titleOf(rec)} added to your cart`);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
