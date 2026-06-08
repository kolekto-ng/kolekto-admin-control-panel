import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  PauseCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { axiosInstance } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type AmbassadorApplication = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  state: string;
  city: string;
  school_organization: string;
  social_links?: string;
  community_size?: number;
  leadership_experience?: string;
  motivation?: string;
  promotion_plan?: string;
  previous_experience?: string;
  status: "pending" | "interview_scheduled" | "accepted" | "rejected" | "suspended";
  interview_date?: string;
  admin_notes?: string;
  created_at: string;
  ambassador_profiles?: Array<{ ambassador_code: string; status: string }>;
};

type AmbassadorResource = {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_url?: string;
  external_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const statusLabels: Record<AmbassadorApplication["status"], string> = {
  pending: "Pending",
  interview_scheduled: "Interview Scheduled",
  accepted: "Accepted",
  rejected: "Rejected",
  suspended: "Suspended",
};

const statusClassNames: Record<AmbassadorApplication["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  interview_scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  suspended: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AmbassadorApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<AmbassadorApplication[]>([]);
  const [selected, setSelected] = useState<AmbassadorApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [resources, setResources] = useState<AmbassadorResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourceSaving, setResourceSaving] = useState(false);
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    category: "training",
    external_url: "",
    sort_order: "100",
  });

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = status !== "all" ? { status } : undefined;
      const { data } = await axiosInstance.get("/adminurlabdkole/ambassadors/applications", { params });
      setApplications(data.applications || []);
      setSelected((current) => {
        if (!current) return data.applications?.[0] || null;
        return data.applications?.find((app: AmbassadorApplication) => app.id === current.id) || data.applications?.[0] || null;
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load ambassador applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    setNotes(selected?.admin_notes || "");
    setInterviewDate(selected?.interview_date ? selected.interview_date.slice(0, 16) : "");
  }, [selected]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return applications;
    return applications.filter((application) =>
      [application.full_name, application.email, application.state, application.city, application.school_organization]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
    );
  }, [applications, query]);

  const runAction = async (action: string, request: () => Promise<any>) => {
    if (!selected) return;
    setActionLoading(action);
    try {
      const { data } = await request();
      toast.success(data.message || "Ambassador application updated");
      await loadApplications();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Action failed");
    } finally {
      setActionLoading("");
    }
  };

  const endpoint = (suffix: string) => `/adminurlabdkole/ambassadors/applications/${selected?.id}/${suffix}`;

  const loadResources = async () => {
    setResourcesLoading(true);
    try {
      const { data } = await axiosInstance.get("/adminurlabdkole/ambassadors/resources");
      setResources(data.resources || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load ambassador resources");
    } finally {
      setResourcesLoading(false);
    }
  };

  const uploadResource = async (event: React.FormEvent) => {
    event.preventDefault();
    setResourceSaving(true);
    try {
      const formData = new FormData();
      Object.entries(resourceForm).forEach(([key, value]) => formData.append(key, value));
      formData.append("is_active", "true");
      if (resourceFile) formData.append("file", resourceFile);

      const { data } = await axiosInstance.post("/adminurlabdkole/ambassadors/resources", formData);
      toast.success(data.message || "Ambassador resource uploaded");
      setResourceForm({ title: "", description: "", category: "training", external_url: "", sort_order: "100" });
      setResourceFile(null);
      await loadResources();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to upload ambassador resource");
    } finally {
      setResourceSaving(false);
    }
  };

  const removeResource = async (resourceId: string) => {
    try {
      const { data } = await axiosInstance.delete(`/adminurlabdkole/ambassadors/resources/${resourceId}`);
      toast.success(data.message || "Ambassador resource removed");
      await loadResources();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to remove ambassador resource");
    }
  };

  const acceptSelected = async () => {
    if (!selected) return;
    setActionLoading("accept");
    try {
      const { data } = await axiosInstance.post(endpoint("accept"), { notes });
      toast.success(data.message || "Ambassador accepted");
      navigate(data.nextUrl || `/ambassadors/${data.application?.id || selected.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to accept ambassador");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
            <Award className="h-4 w-4" />
            Ambassador operations
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Ambassador Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review applications, schedule interviews, and manage ambassador access.</p>
        </div>
        <Button onClick={loadApplications} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-4">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search applicants" className="pl-9" />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
                <option value="all">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {loading && <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-green-700" /></div>}
            {!loading && filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No ambassador applications found.</div>}
            {!loading && filtered.map((application) => (
              <button
                key={application.id}
                onClick={() => setSelected(application)}
                className={`block w-full border-b p-4 text-left transition last:border-b-0 hover:bg-slate-50 ${selected?.id === application.id ? "bg-green-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{application.full_name}</p>
                    <p className="text-sm text-muted-foreground">{application.email}</p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{application.city}, {application.state} - {application.school_organization}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Select an application to review.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">{selected.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.email} - {selected.phone_number}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Location" value={`${selected.city}, ${selected.state}`} />
                <Info label="School/Organization" value={selected.school_organization} />
                <Info label="Community Size" value={String(selected.community_size || "-")} />
                <Info label="Applied" value={new Date(selected.created_at).toLocaleDateString()} />
              </div>

              <Detail title="Leadership Experience" value={selected.leadership_experience} />
              <Detail title="Why they want to join" value={selected.motivation} />
              <Detail title="Promotion plan" value={selected.promotion_plan} />
              <Detail title="Previous experience" value={selected.previous_experience} />
              <Detail title="Social links" value={selected.social_links} />

              {selected.status === "accepted" && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-semibold text-green-950">Accepted Ambassador</p>
                      <p className="text-sm text-green-800">Open the full overview to track earnings, referred organizers, connected accounts, and withdrawals.</p>
                    </div>
                    <Button asChild className="bg-green-700 hover:bg-green-800">
                      <Link to={`/ambassadors/${selected.id}`}>View Overview</Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <label className="text-sm font-medium text-blue-950">Interview Date</label>
                <div className="mt-2 flex flex-col gap-2 md:flex-row">
                  <Input type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} />
                  <Button
                    onClick={() => runAction("interview", () => axiosInstance.patch(endpoint("interview"), { interview_date: interviewDate, notes }))}
                    disabled={!interviewDate || actionLoading === "interview"}
                    className="gap-2 bg-blue-700 hover:bg-blue-800"
                  >
                    {actionLoading === "interview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    Set Interview
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="mt-2" placeholder="Add review notes, interview feedback, or access decision context." />
                <Button
                  variant="outline"
                  onClick={() => runAction("notes", () => axiosInstance.post(endpoint("notes"), { notes }))}
                  disabled={!notes.trim() || actionLoading === "notes"}
                  className="mt-2"
                >
                  Save Note
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ActionButton label="Accept" icon={CheckCircle2} loading={actionLoading === "accept"} className="bg-green-700 hover:bg-green-800" onClick={acceptSelected} />
                <ActionButton label="Reject" icon={XCircle} loading={actionLoading === "reject"} variant="destructive" onClick={() => runAction("reject", () => axiosInstance.post(endpoint("reject"), { notes }))} />
                <ActionButton label="Suspend" icon={PauseCircle} loading={actionLoading === "suspend"} variant="outline" onClick={() => runAction("suspend", () => axiosInstance.post(endpoint("suspend"), { notes }))} />
                <ActionButton label="Reactivate" icon={RefreshCw} loading={actionLoading === "reactivate"} variant="outline" onClick={() => runAction("reactivate", () => axiosInstance.post(endpoint("reactivate"), { notes }))} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-green-700">
              <FileText className="h-4 w-4" />
              Ambassador resources
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Resource Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload files or add external links that all accepted ambassadors can access in their portal.</p>
          </div>
          <Button onClick={loadResources} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 p-5 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={uploadResource} className="space-y-4 rounded-xl border bg-slate-50 p-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={resourceForm.title}
                onChange={(event) => setResourceForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ambassador handbook"
                required
                className="mt-2 bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={resourceForm.description}
                onChange={(event) => setResourceForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short description for ambassadors"
                rows={3}
                className="mt-2 bg-white"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={resourceForm.category}
                  onChange={(event) => setResourceForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="training"
                  className="mt-2 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={resourceForm.sort_order}
                  onChange={(event) => setResourceForm((current) => ({ ...current, sort_order: event.target.value }))}
                  className="mt-2 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">External URL</label>
              <Input
                value={resourceForm.external_url}
                onChange={(event) => setResourceForm((current) => ({ ...current, external_url: event.target.value }))}
                placeholder="https://..."
                className="mt-2 bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Upload File</label>
              <Input
                type="file"
                onChange={(event) => setResourceFile(event.target.files?.[0] || null)}
                className="mt-2 bg-white"
              />
            </div>
            <Button type="submit" disabled={resourceSaving || (!resourceFile && !resourceForm.external_url.trim())} className="gap-2 bg-green-700 hover:bg-green-800">
              {resourceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload Resource
            </Button>
          </form>

          <div className="overflow-hidden rounded-xl border">
            {resourcesLoading && <div className="flex h-44 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-green-700" /></div>}
            {!resourcesLoading && resources.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No ambassador resources uploaded yet.</div>}
            {!resourcesLoading && resources.map((resource) => (
              <div key={resource.id} className="flex flex-col justify-between gap-3 border-b p-4 last:border-b-0 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{resource.title}</p>
                    <Badge variant="outline">{resource.category}</Badge>
                    {!resource.is_active && <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-600">Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{resource.description || "No description"}</p>
                  <a href={resource.file_url || resource.external_url || "#"} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-green-700">
                    Open resource
                  </a>
                </div>
                <Button variant="outline" onClick={() => removeResource(resource.id)} className="w-fit gap-2 text-red-700 hover:text-red-800">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AmbassadorApplication["status"] }) {
  return <Badge variant="outline" className={statusClassNames[status]}>{statusLabels[status]}</Badge>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Detail({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 whitespace-pre-wrap rounded-xl border bg-slate-50 p-3 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  loading,
  onClick,
  className,
  variant,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
  onClick: () => void;
  className?: string;
  variant?: "outline" | "destructive";
}) {
  return (
    <Button onClick={onClick} disabled={loading} className={className} variant={variant}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  );
}
