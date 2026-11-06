import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/appRuntime";
import type { SiteRecord } from "@/lib/storefront.functions";

const PRICE_KEYS = ["price", "amount", "rate", "fee", "cost", "value", "monthly_price", "rent"];
const IMAGE_KEYS = ["image", "image_url", "photo", "cover", "thumbnail", "picture"];
const DESC_KEYS = ["description", "summary", "details", "notes", "content", "excerpt"];
const CATEGORY_KEYS = ["category", "type", "collection", "cuisine", "section", "genre"];

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

export function titleOf(r: SiteRecord): string {
  for (const k of ["name", "title", "product", "item"]) {
    const v = str(r.data[k]);
    if (v.trim()) return v.trim();
  }
  return "Item";
}

export function priceOf(r: SiteRecord): number {
  for (const k of PRICE_KEYS) {
    const n = Number(r.data[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function imageOf(r: SiteRecord): string {
  for (const k of IMAGE_KEYS) {
    const v = str(r.data[k]);
    if (/^https?:\/\//i.test(v)) return v;
  }
  return "";
}

export function descOf(r: SiteRecord): string {
  for (const k of DESC_KEYS) {
    const v = str(r.data[k]);
    if (v.trim()) return v.trim();
  }
  return "";
}

export function categoryOf(r: SiteRecord): string {
  for (const k of CATEGORY_KEYS) {
    const v = str(r.data[k]);
    if (v.trim()) return v.trim();
  }
  return "";
}

export function inStock(r: SiteRecord): boolean {
  for (const k of ["stock", "quantity", "qty", "on_hand", "available"]) {
    const raw = r.data[k];
    if (raw === undefined || raw === null || raw === "") continue;
    return (Number(raw) || 0) > 0;
  }
  return true;
}

export function Money({ value, currency }: { value: number; currency: string }) {
  if (value <= 0) return <span className="text-muted-foreground">Enquire</span>;
  return <span>{formatMoney(value, currency)}</span>;
}

export function ItemCard({
  projectId,
  record,
  currency,
  onAdd,
}: {
  projectId: string;
  record: SiteRecord;
  currency: string;
  onAdd?: (r: SiteRecord) => void;
}) {
  const image = imageOf(record);
  const price = priceOf(record);
  const available = inStock(record);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/site/$id/item/$rid"
        params={{ id: projectId, rid: record.id }}
        className="block aspect-[4/3] overflow-hidden bg-muted"
        aria-label={titleOf(record)}
      >
        {image ? (
          <img
            src={image}
            alt={titleOf(record)}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-brand-gradient/10 text-3xl font-semibold text-primary/40">
            {titleOf(record).slice(0, 1).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {categoryOf(record) ? (
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{categoryOf(record)}</p>
        ) : null}
        <h3 className="font-display text-base leading-snug">
          <Link to="/site/$id/item/$rid" params={{ id: projectId, rid: record.id }} className="hover:underline">
            {titleOf(record)}
          </Link>
        </h3>
        {descOf(record) ? <p className="line-clamp-2 text-sm text-muted-foreground">{descOf(record)}</p> : null}
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="font-medium"><Money value={price} currency={currency} /></p>
          {onAdd ? (
            <button
              type="button"
              disabled={!available}
              onClick={() => onAdd(record)}
              className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background transition hover:opacity-85 disabled:opacity-40"
            >
              {available ? "Add" : "Sold out"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
