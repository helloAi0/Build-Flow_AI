import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  source?: "waitlist" | "newsletter" | "early_access" | "product_updates";
  compact?: boolean;
  placeholder?: string;
  cta?: string;
}

export function WaitlistForm({ source = "newsletter", compact, placeholder = "you@company.com", cta = "Join" }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    setLoading(true);
    const { error } = await supabase.from("waitlist").insert({
      email: email.trim().toLowerCase(),
      name: name.trim() || null,
      business_type: businessType.trim() || null,
      source,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") { setDone(true); return; }
      return toast.error(error.message);
    }
    setDone(true);
    toast.success("You're on the list. We'll be in touch.");
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white">
        <CheckCircle2 className="h-4 w-4 text-[oklch(0.82_0.16_220)]" /> You're on the list.
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder={placeholder}
          className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />
        <Button type="submit" disabled={loading} className="bg-white text-navy hover:bg-white/90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : cta}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
        className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder={placeholder}
        className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />
      <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="What kind of business?"
        className="sm:col-span-2 border-white/15 bg-white/10 text-white placeholder:text-white/40" />
      <Button type="submit" disabled={loading} className="sm:col-span-2 bg-white text-navy hover:bg-white/90">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{cta}
      </Button>
    </form>
  );
}
