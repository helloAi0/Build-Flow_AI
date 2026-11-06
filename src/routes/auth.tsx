import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

const search = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — BuildFlow AI" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirect ?? "/dashboard" });
    });
  }, [navigate, redirect]);

  const credSchema = z.object({
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
  });
  const signupSchema = credSchema.extend({
    name: z.string().trim().min(1, "Enter your name").max(80),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse({ email, password, name });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email, password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: parsed.data.name } },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. Welcome!");
          navigate({ to: "/dashboard" });
        } else {
          // Email confirmation is on: the account exists but is not signed in yet.
          setNeedsConfirmation(parsed.data.email);
        }
      } else if (mode === "forgot") {
        const parsed = z.string().trim().email("Enter a valid email").safeParse(email);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
      } else {
        const parsed = credSchema.safeParse({ email, password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: redirect ?? "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const sub = mode === "signup" ? "Start building business software with AI." : mode === "forgot" ? "We'll email you a reset link." : "Sign in to your BuildFlow AI workspace.";

  return (
    <div className="min-h-dvh bg-hero text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold">BuildFlow AI</span>
        </Link>
        <Card className="w-full border-white/10 bg-white/[0.04] p-8 text-white backdrop-blur-xl">
          {needsConfirmation ? (
            <>
              <h1 className="font-display text-2xl">Confirm your email</h1>
              <p className="mt-2 text-sm text-white/70">
                We sent a confirmation link to <span className="font-medium text-white">{needsConfirmation}</span>.
                Open it to activate your account, then sign in here.
              </p>
              <p className="mt-4 text-xs text-white/50">Can't find it? Check your spam folder.</p>
              <Button type="button" onClick={() => setNeedsConfirmation(null)} variant="outline" className="mt-6 w-full border-white/15 bg-white/5 text-white hover:bg-white/10">
                Back
              </Button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl">{title}</h1>
              <p className="mt-1 text-sm text-white/70">{sub}</p>

              {mode !== "forgot" && (
                <>
                  <Button onClick={onGoogle} disabled={loading} type="button" variant="outline" className="mt-6 w-full border-white/15 bg-white/5 text-white hover:bg-white/10">
                    Continue with Google
                  </Button>
                  <div className="my-6 flex items-center gap-3 text-xs text-white/40">
                    <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <Label htmlFor="auth-name" className="text-white/80">Full name</Label>
                    <Input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 border-white/10 bg-white/5 text-white" />
                  </div>
                )}
                <div>
                  <Label htmlFor="auth-email" className="text-white/80">Email</Label>
                  <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 border-white/10 bg-white/5 text-white" />
                </div>
                {mode !== "forgot" && (
                  <div>
                    <Label htmlFor="auth-password" className="text-white/80">Password</Label>
                    <Input id="auth-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1 border-white/10 bg-white/5 text-white" />
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-white text-navy hover:bg-white/90">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 flex justify-between text-xs text-white/60">
            {mode === "signin" ? (
              <>
                <Link to="/auth" search={{ mode: "forgot" }} className="hover:text-white">Forgot password?</Link>
                <Link to="/auth" search={{ mode: "signup" }} className="hover:text-white">Create an account</Link>
              </>
            ) : (
              <Link to="/auth" search={{ mode: "signin" }} className="hover:text-white">Back to sign in</Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
