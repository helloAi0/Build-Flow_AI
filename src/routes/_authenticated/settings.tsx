import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — BuildFlow AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [notif, setNotif] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      setName((u.user.user_metadata as { full_name?: string })?.full_name ?? "");
      const { data: s } = await supabase.from("user_settings").select("*").maybeSingle();
      if (s) { setNotif(s.notifications_enabled); setApiKey(s.api_key ?? ""); }
      const { data: sub } = await supabase.from("subscriptions").select("*").maybeSingle();
      if (sub) setPlan(sub.plan);
    })();
  }, []);

  const saveProfile = async () => {
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) return toast.error(error.message);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ full_name: name }).eq("id", u.user.id);
    toast.success("Profile updated");
  };
  const savePassword = async () => {
    if (password.length < 6) return toast.error("Password too short");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword(""); toast.success("Password updated");
  };
  const saveNotif = async (v: boolean) => {
    setNotif(v);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("user_settings").update({ notifications_enabled: v }).eq("user_id", u.user.id);
  };
  const rotateKey = async () => {
    const key = "bfk_" + crypto.randomUUID().replace(/-/g, "");
    setApiKey(key);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("user_settings").update({ api_key: key }).eq("user_id", u.user.id);
    toast.success("API key rotated");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, billing, and API keys.</p>
      </div>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="api">API keys</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="space-y-4 p-6">
            <div><Label>Email</Label><Input value={email} disabled className="mt-1" /></div>
            <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Email notifications</p><p className="text-xs text-muted-foreground">Product updates and tips.</p></div>
              <Switch checked={notif} onCheckedChange={saveNotif} />
            </div>
            <Button onClick={saveProfile} className="bg-brand-gradient text-white">Save profile</Button>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="space-y-4 p-6">
            <div><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" /></div>
            <Button onClick={savePassword} className="bg-brand-gradient text-white">Update password</Button>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 font-display text-2xl">{plan.toUpperCase()}</p>
            <p className="mt-4 text-sm text-muted-foreground">Plans are managed manually while billing integration is being finalized. Contact us to upgrade, downgrade, or cancel — we'll process the change the same day.</p>
            <a href="/contact"><Button className="mt-4 bg-brand-gradient text-white">Contact us to change plan</Button></a>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="space-y-4 p-6">
            <div>
              <Label>API key</Label>
              <div className="mt-1 flex gap-2">
                <Input value={apiKey || "No key generated yet"} readOnly />
                <Button variant="outline" onClick={() => { if (apiKey) { navigator.clipboard.writeText(apiKey); toast.success("Copied"); } }}><Copy className="h-4 w-4" /></Button>
                <Button onClick={rotateKey} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Rotate</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Use this key with the BuildFlow API. Treat it like a password.</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
