import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/email/RichTextEditor";
import { createCampaign } from "./api";
import { listTemplates, createTemplate, deleteTemplate, type EmailTemplate } from "./api";

export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newHtml, setNewHtml] = useState("<p>Write your template content here.</p>");
  const [savingTemplate, setSavingTemplate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setTemplates(await listTemplates());
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUseTemplate(template: EmailTemplate) {
    setCreating(true);
    try {
      const campaign = await createCampaign({
        name: `${template.name} — ${new Date().toLocaleDateString()}`,
        subject: template.subject,
        previewText: template.preview_text || undefined,
        htmlBody: template.html_body,
        templateId: template.id,
      });
      navigate(`/communications/campaigns/${campaign.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create campaign from template");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveNewTemplate() {
    if (!newName.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSavingTemplate(true);
    try {
      const template = await createTemplate({ name: newName, subject: newSubject, htmlBody: newHtml, category: "custom" });
      setTemplates((prev) => [template, ...prev]);
      setNewOpen(false);
      setNewName("");
      setNewSubject("");
      setNewHtml("<p>Write your template content here.</p>");
      toast.success("Template created");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create template");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDelete(template: EmailTemplate) {
    try {
      await deleteTemplate(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      toast.success("Template deleted");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete template");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kolekto-orange">Communications</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Reusable starting points for new campaigns.</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-kolekto-orange" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.subject || "No subject"}</p>
                  </div>
                  {t.is_system && (
                    <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-slate-600">
                      <Lock className="h-3 w-3" /> Built-in
                    </Badge>
                  )}
                </div>
                <div
                  className="line-clamp-4 flex-1 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: t.html_body }}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={creating} onClick={() => handleUseTemplate(t)}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use template"}
                  </Button>
                  {!t.is_system && (
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Weekly Digest" />
              </div>
              <div className="space-y-1.5">
                <Label>Default subject</Label>
                <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Email subject line" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <RichTextEditor value={newHtml} onChange={setNewHtml} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNewTemplate} disabled={savingTemplate} className="gap-2 bg-kolekto-orange text-white hover:bg-kolekto-orange/90">
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
