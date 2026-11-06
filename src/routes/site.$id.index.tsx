import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import { ItemCard, titleOf } from "@/components/site/parts";

export const Route = createFileRoute("/site/$id/")({
  component: SiteHome,
});

function SiteHome() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const currency = site.settings.currency;
  const featured = site.catalog.slice(0, 6);
  const categories = [...new Set(site.catalog.map((r) => String(r.data["category"] ?? "")).filter(Boolean))].slice(0, 8);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Welcome</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-6xl">{site.name}</h1>
          {site.tagline ? <p className="mt-5 max-w-xl text-lg text-muted-foreground">{site.tagline}</p> : null}
          <div className="mt-9 flex flex-wrap gap-3">
            {site.catalogKind ? (
              <Link
                to="/site/$id/catalog"
                params={{ id: site.projectId }}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-85"
              >
                Explore {site.catalogTitle.toLowerCase()} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              to="/site/$id/contact"
              params={{ id: site.projectId }}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:bg-muted"
            >
              {site.requestLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pt-14">
          <h2 className="font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">Browse by category</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c}
                to="/site/$id/catalog"
                params={{ id: site.projectId }}
                search={{ category: c }}
                className="rounded-full border border-border px-4 py-1.5 text-sm transition hover:bg-muted"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl sm:text-3xl">{site.catalogTitle}</h2>
            <Link
              to="/site/$id/catalog"
              params={{ id: site.projectId }}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              View all
            </Link>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => (
              <ItemCard key={r.id} projectId={site.projectId} record={r} currency={currency} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="font-display text-2xl">We're just getting started</h2>
          <p className="mt-2 text-muted-foreground">
            Our {site.catalogTitle.toLowerCase()} is being prepared. Get in touch and we'll help you personally.
          </p>
          <Link
            to="/site/$id/contact"
            params={{ id: site.projectId }}
            className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
          >
            {site.requestLabel}
          </Link>
        </section>
      )}

      {/* Owner-written pages */}
      {site.pages.map((p) => (
        <section key={p.slug} id={`page-${p.slug}`} className="border-t border-border">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="font-display text-2xl">{p.title}</h2>
            {p.content ? <p className="mt-4 whitespace-pre-line text-muted-foreground">{p.content}</p> : null}
          </div>
        </section>
      ))}

      {/* Reviews */}
      {site.reviews.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="font-display text-2xl">What people say</h2>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {site.reviews.map((r) => {
                const rating = Number(r.data["rating"] ?? 5) || 5;
                return (
                  <blockquote key={r.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex gap-0.5" aria-label={`${rating} out of 5`}>
                      {Array.from({ length: Math.min(5, Math.max(1, Math.round(rating))) }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-500" />
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {String(r.data["comment"] ?? r.data["review"] ?? r.data["notes"] ?? "Wonderful experience.")}
                    </p>
                    <footer className="mt-3 text-sm font-medium">{titleOf(r)}</footer>
                  </blockquote>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
