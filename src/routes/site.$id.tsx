import { createFileRoute, Link, Outlet, notFound, useLoaderData } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { getPublicSite } from "@/lib/storefront.functions";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/site/$id")({
  loader: async ({ params }) => {
    const site = await getPublicSite({ data: { projectId: params.id } });
    if (!site) throw notFound();
    return { site };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Website unavailable" }, { name: "robots", content: "noindex" }] };
    }
    const { site } = loaderData;
    const description = site.tagline || `Browse ${site.name} online — ${site.catalogTitle.toLowerCase()}, contact details and enquiries.`;
    return {
      meta: [
        { title: `${site.name} — Official website` },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${site.name} — Official website` },
        { property: "og:description", content: description.slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: SiteError,
  notFoundComponent: SiteNotFound,
  component: SiteLayout,
});

// Separate wrappers: the route code-splitter cannot share one function
// between errorComponent and notFoundComponent in production builds.
function SiteError() {
  return <SiteUnavailable />;
}

function SiteNotFound() {
  return <SiteUnavailable />;
}

function SiteUnavailable() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div>
        <h1 className="font-display text-2xl">This website isn't published</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The owner hasn't published this website yet, or the link is no longer valid.
        </p>
      </div>
    </div>
  );
}

function SiteLayout() {
  const { site } = useLoaderData({ from: "/site/$id" });
  const cart = useCart(site.projectId);
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/site/$id" as const, label: "Home", exact: true },
    ...(site.catalogKind ? [{ to: "/site/$id/catalog" as const, label: site.catalogTitle, exact: false }] : []),
    { to: "/site/$id/contact" as const, label: "Contact", exact: false },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
          <Link to="/site/$id" params={{ id: site.projectId }} className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
              {site.initials}
            </span>
            <span className="font-display text-base tracking-tight">{site.name}</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-7 text-sm md:flex" aria-label="Website navigation">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                params={{ id: site.projectId }}
                activeOptions={{ exact: l.exact }}
                activeProps={{ className: "text-foreground" }}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            {site.pages.map((p) => (
              <a key={p.slug} href={`#page-${p.slug}`} className="text-muted-foreground transition hover:text-foreground">
                {p.title}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            {site.canOrder ? (
              <Link
                to="/site/$id/cart"
                params={{ id: site.projectId }}
                className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
                aria-label={`Cart (${cart.count} items)`}
              >
                <ShoppingBag className="h-5 w-5" />
                {cart.count > 0 ? (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {cart.count}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-border px-5 py-3 md:hidden" aria-label="Website navigation">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                params={{ id: site.projectId }}
                onClick={() => setOpen(false)}
                className="block py-2 text-sm text-muted-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <Outlet />

      <footer className="mt-20 border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          <div>
            <p className="font-display text-lg">{site.name}</p>
            {site.tagline ? <p className="mt-1 text-sm text-muted-foreground">{site.tagline}</p> : null}
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Visit us</p>
            {site.settings.address ? <p className="whitespace-pre-line">{site.settings.address}</p> : <p>Get in touch for directions.</p>}
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Contact</p>
            {site.settings.email ? <p><a className="hover:text-foreground" href={`mailto:${site.settings.email}`}>{site.settings.email}</a></p> : null}
            {site.settings.phone ? <p><a className="hover:text-foreground" href={`tel:${site.settings.phone}`}>{site.settings.phone}</a></p> : null}
            <Link to="/site/$id/contact" params={{ id: site.projectId }} className="mt-2 inline-block underline hover:text-foreground">
              {site.requestLabel}
            </Link>
          </div>
        </div>
        <p className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
