import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Bug, Lightbulb, LifeBuoy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeedbackType = "bug" | "feature" | "support";

export function FeedbackDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("feature");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (message.trim().length < 5) return toast.error("Tell us a bit more (min 5 characters)");
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback").insert({
      type, message: message.trim(),
      email: email.trim() || u.user?.email || null,
      user_id: u.user?.id ?? null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — we read every message.");
    setMessage(""); setEmail(""); setOpen(false);
  };

  const opts: Array<{ id: FeedbackType; icon: typeof Bug; label: string }> = [
    { id: "bug", icon: Bug, label: "Report bug" },
    { id: "feature", icon: Lightbulb, label: "Request feature" },
    { id: "support", icon: LifeBuoy, label: "Contact support" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Send feedback</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {opts.map((o) => (
            <button key={o.id} type="button" onClick={() => setType(o.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition ${type === o.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}>
              <o.icon className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
              placeholder={type === "bug" ? "What broke? Steps to reproduce…" : type === "feature" ? "What should we build?" : "How can we help?"} />
          </div>
          <div>
            <Label className="text-xs">Reply email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@company.com" />
          </div>
          <Button onClick={submit} disabled={loading} className="w-full bg-brand-gradient text-white">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
