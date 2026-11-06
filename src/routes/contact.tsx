import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — BuildFlow AI" },
      { name: "description", content: "Get in touch with the BuildFlow AI team. We read every message." },
      { property: "og:title", content: "Contact BuildFlow AI" },
      { property: "og:description", content: "Questions, partnerships, support — we read every message." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email");
    if (message.trim().length < 5) return toast.error("Tell us a bit more");
    setLoading(true);
    const { error } = await supabase.from("feedback").insert({
      type: "support", email: email.trim(), message: message.trim(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Message received. We'll reply soon.");
  };

  return (
    <div className="min-h-dvh bg-hero text-white">
      <SiteNav />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[oklch(0.82_0.16_220)]">Contact</p>
            <h1 className="mt-2 font-display text-4xl text-white sm:text-5xl">Let's talk.</h1>
            <p className="mt-4 text-white/70">Product feedback, partnerships, or just want to say hi? We read every message.</p>
            <div className="mt-8 space-y-3">
              <a href="mailto:hello@buildflow.ai" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white hover:bg-white/10">
                <Mail className="h-4 w-4 text-[oklch(0.82_0.16_220)]" /> hello@buildflow.ai
              </a>
              <a href="mailto:support@buildflow.ai" className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white hover:bg-white/10">
                <MessageSquare className="h-4 w-4 text-[oklch(0.82_0.16_220)]" /> support@buildflow.ai
              </a>
            </div>
          </div>
          <Card className="border-white/10 bg-white/[0.04] p-6 text-white">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-[oklch(0.82_0.16_220)]" />
                <h2 className="font-display text-xl">Thanks — we got it.</h2>
                <p className="text-sm text-white/70">We aim to reply within 1 business day.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label className="text-xs text-white/70">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@company.com" className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />
                </div>
                <div>
                  <Label className="text-xs text-white/70">Message</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="How can we help?" className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-white text-navy hover:bg-white/90">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send message
                </Button>
              </form>
            )}
          </Card>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
