import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — BuildFlow AI" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-dvh bg-hero text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold">BuildFlow AI</span>
        </Link>
        <Card className="w-full border-white/10 bg-white/[0.04] p-8 text-white">
          <h1 className="font-display text-2xl">Choose a new password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label className="text-white/80">New password</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 border-white/10 bg-white/5 text-white" />
            </div>
            <Button disabled={loading} className="w-full bg-white text-navy hover:bg-white/90">Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
