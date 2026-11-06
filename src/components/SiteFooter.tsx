import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { WaitlistForm } from "@/components/WaitlistForm";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[oklch(0.16_0.05_260)] py-14 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 sm:grid-cols-2 md:grid-cols-5">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-semibold text-white">BuildFlow AI</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm">Describe your business problem. AI builds the solution.</p>
          <div className="mt-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Get product updates</p>
            <WaitlistForm source="newsletter" compact placeholder="you@company.com" cta="Subscribe" />
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" hash="features" className="hover:text-white">Features</Link></li>
            <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link to="/" hash="faq" className="hover:text-white">FAQ</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-white">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-6 pt-6 text-xs text-white/50">
        © {new Date().getFullYear()} BuildFlow AI. All rights reserved.
      </div>
    </footer>
  );
}
