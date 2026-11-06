import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(0.2_0.05_260/0.7)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold text-white">BuildFlow<span className="text-gradient-light"> AI</span></span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          <Link to="/" hash="features" className="text-sm text-white/70 hover:text-white">Features</Link>
          <Link to="/" hash="how" className="text-sm text-white/70 hover:text-white">How it works</Link>
          <Link to="/pricing" className="text-sm text-white/70 hover:text-white">Pricing</Link>
          <Link to="/" hash="faq" className="text-sm text-white/70 hover:text-white">FAQ</Link>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/auth">
            <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="bg-white text-navy hover:bg-white/90">Get started</Button>
          </Link>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[oklch(0.18_0.05_260)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            <Link to="/" hash="features" onClick={() => setOpen(false)} className="text-sm text-white/80">Features</Link>
            <Link to="/" hash="how" onClick={() => setOpen(false)} className="text-sm text-white/80">How it works</Link>
            <Link to="/pricing" onClick={() => setOpen(false)} className="text-sm text-white/80">Pricing</Link>
            <Link to="/" hash="faq" onClick={() => setOpen(false)} className="text-sm text-white/80">FAQ</Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/auth" onClick={() => setOpen(false)}><Button variant="outline" className="w-full border-white/15 bg-white/5 text-white">Sign in</Button></Link>
              <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}><Button className="w-full bg-white text-navy">Get started</Button></Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
