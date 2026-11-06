import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Trash2, Pencil, FolderKanban } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects — BuildFlow AI" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const qc = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("projects").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const create = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("projects").insert({ user_id: u.user.id, name, description: desc });
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setOpen(false); setName(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Project deleted");
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  const rename = async () => {
    if (!renameId) return;
    const { error } = await supabase.from("projects").update({ name: renameVal }).eq("id", renameId);
    if (error) return toast.error(error.message);
    setRenameId(null);
    qc.invalidateQueries({ queryKey: ["projects"] });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl sm:text-3xl">Projects</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Organize your generated solutions.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0 bg-brand-gradient text-white"><Plus className="mr-2 h-4 w-4" /> New<span className="hidden sm:inline">&nbsp;project</span></Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">{[0,1,2].map((i) => <Card key={i} className="h-32 animate-pulse bg-muted" />)}</div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create one to organize your AI-generated solutions.</p>
          <Button onClick={() => setOpen(true)} className="mt-4 bg-brand-gradient text-white"><Plus className="mr-2 h-4 w-4" /> New project</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="group relative p-6 transition hover:shadow-card">
              <div className="absolute right-2 top-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setRenameId(p.id); setRenameVal(p.name); }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => remove(p.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Link to="/run/$id" params={{ id: p.id }} className="block">
                <FolderKanban className="h-6 w-6 text-primary" />
                <h3 className="mt-4 font-display text-lg">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description || "No description"}</p>
                <p className="mt-4 text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at))} ago</p>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My new business idea" /></div>
            <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!name} className="bg-brand-gradient text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename project</DialogTitle></DialogHeader>
          <Input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameId(null)}>Cancel</Button>
            <Button onClick={rename} className="bg-brand-gradient text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
