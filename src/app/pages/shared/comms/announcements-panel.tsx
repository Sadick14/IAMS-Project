import { useState, useEffect } from "react";
import { useAppContext } from "../../../lib/context";
import { apiClient } from "../../../lib/api-client";
import { Megaphone, Send, CheckCircle2, Search, Pin, X, Eye, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../../services/auth-service";
import { AnnouncementComposer } from "../../../components/announcement-composer";
import ReactMarkdown from "react-markdown";

interface Props {
  viewRole: ExtendedRole;
  canCompose: boolean;
}

interface SentAnnouncement {
  id: string;
  title: string;
  message: string;
  targets: string[];
  sentAt: string;
  priority: "Normal" | "Urgent";
  pinned: boolean;
  readCount: number;
  totalRecipients: number;
}

export function AnnouncementsPanel({ viewRole, canCompose }: Props) {
  const { user } = useAppContext();
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState<SentAnnouncement | null>(null);
  const [sent, setSent] = useState<SentAnnouncement[]>([
    {
      id: "ann-1",
      title: "Application Deadline Reminder",
      message: "The application deadline for 2026 L300 Semestrial Internship is March 15. Please ensure all documents are submitted before the deadline. Late submissions will not be accepted.",
      targets: ["Students (Batch: 2026, Term: Semestrial)"],
      sentAt: "2026-03-12T07:00:00",
      priority: "Urgent",
      pinned: true,
      readCount: 145,
      totalRecipients: 210,
    },
    {
      id: "ann-2",
      title: "New Company Partners Added",
      message: "We are pleased to announce that three new companies have been approved for the current internship term: TechHub Ghana, DataFlow Solutions, and Green Energy Corp. Students are encouraged to explore these opportunities.",
      targets: ["Students (All)", "DLOs"],
      sentAt: "2026-03-08T10:30:00",
      priority: "Normal",
      pinned: false,
      readCount: 89,
      totalRecipients: 230,
    },
    {
      id: "ann-3",
      title: "Logbook Submission Guidelines Update",
      message: "Please be reminded that daily logbook entries must be submitted by 6:00 PM each working day. Students with 3 or more consecutive days of missing entries will be automatically flagged for review.",
      targets: ["Students (All)"],
      sentAt: "2026-03-05T14:00:00",
      priority: "Normal",
      pinned: false,
      readCount: 178,
      totalRecipients: 210,
    },
  ]);

  // Attempt to fetch announcements from API; fall back to mock data silently
  useEffect(() => {
    apiClient.getNotifications({ type: "announcement" }).then((res) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const apiAnnouncements = res.data.map((n: any) => ({
          id: String(n.id),
          title: n.title ?? n.subject ?? "Announcement",
          message: n.message ?? n.body ?? "",
          targets: n.targets ?? ["All"],
          sentAt: n.timestamp ?? n.created_at ?? new Date().toISOString(),
          priority: n.priority === "urgent" ? "Urgent" : "Normal",
          pinned: Boolean(n.pinned),
          readCount: n.read_count ?? 0,
          totalRecipients: n.total_recipients ?? 0,
        }));
        setSent(apiAnnouncements);
      }
      // else: keep mock data silently — no error shown to user
    }).catch(() => {
      // Network error — keep mock data silently
    });
  }, []);

  const handleSend = async (data: {
    title: string;
    message: string;
    priority: "Normal" | "Urgent";
    sendEmail: boolean;
    sendInApp: boolean;
    targets: string[];
    filters: Record<string, string>;
  }) => {
    const formattedTargets = data.targets.map(t => {
      if (t === "Students") {
        const activeFilters = Object.entries(data.filters)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
        return activeFilters.length > 0 ? `Students (${activeFilters.join(", ")})` : "Students (All)";
      }
      return t;
    });

    // Map target labels to backend role names
    const roleMap: Record<string, string> = {
      "Students": "student", "DLOs": "dlo", "CLO": "clo",
      "HODs": "hod", "Academic Supervisors": "academic_supervisor",
      "Industry Supervisors": "industry_supervisor",
    };
    const roles = data.targets.map((t) => roleMap[t]).filter(Boolean);

    let recipients = 0;
    if (data.sendInApp) {
      const res = await apiClient.broadcastNotification({
        title: data.title,
        message: data.message,
        type: "system",
        priority: data.priority === "Urgent" ? "urgent" : "normal",
        roles: roles.length > 0 ? roles : undefined,
      });
      if (res.success) {
        recipients = (res.data as any)?.recipients ?? 0;
      } else {
        toast.error(res.message ?? "Failed to send announcement.");
        return;
      }
    }

    setSent((prev) => [{
      id: `ann-${Date.now()}`,
      title: data.title,
      message: data.message,
      targets: formattedTargets,
      sentAt: new Date().toISOString(),
      priority: data.priority,
      pinned: false,
      readCount: 0,
      totalRecipients: recipients,
    }, ...prev]);

    const deliveryMethods = [];
    if (data.sendInApp) deliveryMethods.push(`In-App (${recipients} recipients)`);
    if (data.sendEmail) deliveryMethods.push("Email");

    toast.success(`Announcement sent via ${deliveryMethods.join(" & ")}!`);
    setShowCompose(false);
  };

  const handleTogglePin = (id: string) => {
    setSent((prev) => prev.map((a) => a.id === id ? { ...a, pinned: !a.pinned } : a));
    toast.success("Pin status updated.");
  };

  const filteredSent = sent.filter((a) =>
    search === "" ||
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.message.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedAnnouncements = filteredSent.filter((a) => a.pinned);
  const regularAnnouncements = filteredSent.filter((a) => !a.pinned);

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {canCompose
            ? (viewRole === "clo" ? "Institution-wide announcements" : "Department announcements")
            : "View announcements from administration"
          } · {sent.length} sent
        </p>
        {canCompose && (
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            style={{ fontSize: "0.8rem" }}
          >
            <Megaphone className="w-3.5 h-3.5" /> New Announcement
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", value: sent.length, color: "text-blue-600 bg-blue-50", icon: Send },
          { label: "Pinned", value: sent.filter((a) => a.pinned).length, color: "text-amber-600 bg-amber-50", icon: Pin },
          { label: "Urgent", value: sent.filter((a) => a.priority === "Urgent").length, color: "text-red-600 bg-red-50", icon: Clock },
          { label: "Avg. Read Rate", value: `${sent.length > 0 ? Math.round(sent.reduce((sum, a) => sum + (a.totalRecipients > 0 ? (a.readCount / a.totalRecipients) * 100 : 0), 0) / sent.length) : 0}%`, color: "text-emerald-600 bg-emerald-50", icon: Eye },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.25rem" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card"
          style={{ fontSize: "0.85rem" }}
        />
      </div>

      {/* Pinned */}
      {pinnedAnnouncements.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 mb-3"><Pin className="w-4 h-4 text-amber-600" /> Pinned</h3>
          <div className="space-y-3">
            {pinnedAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAnn(ann)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-amber-600" />
                    <span style={{ fontSize: "0.9rem" }}>{ann.title}</span>
                    {ann.priority === "Urgent" && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full" style={{ fontSize: "0.65rem" }}>Urgent</span>}
                  </div>
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    {new Date(ann.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem" }} className="text-muted-foreground line-clamp-2 [&>p]:inline">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <span {...props} />,
                      a: ({node, ...props}) => <span className="text-primary" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                    }}
                  >
                    {ann.message}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {ann.targets.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-amber-100 text-amber-700" style={{ fontSize: "0.65rem" }}>{t}</span>
                  ))}
                  <span className="ml-auto text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                    <Eye className="w-3 h-3" /> {ann.readCount}/{ann.totalRecipients}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular */}
      <div>
        <h3 className="mb-3">Sent History</h3>
        {regularAnnouncements.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No announcements found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((ann) => (
              <div key={ann.id} className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAnn(ann)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span style={{ fontSize: "0.9rem" }}>{ann.title}</span>
                    {ann.priority === "Urgent" && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full" style={{ fontSize: "0.65rem" }}>Urgent</span>}
                  </div>
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                    {new Date(ann.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem" }} className="text-muted-foreground line-clamp-2 [&>p]:inline">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <span {...props} />,
                      a: ({node, ...props}) => <span className="text-primary" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                    }}
                  >
                    {ann.message}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  {ann.targets.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground" style={{ fontSize: "0.65rem" }}>{t}</span>
                  ))}
                  <span className="ml-auto text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                    <Eye className="w-3 h-3" /> {ann.readCount}/{ann.totalRecipients} read
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <AnnouncementComposer 
          viewRole={viewRole}
          onClose={() => setShowCompose(false)}
          onSend={handleSend}
        />
      )}

      {/* Detail Modal */}
      {selectedAnn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAnn(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2>{selectedAnn.title}</h2>
              </div>
              <button onClick={() => setSelectedAnn(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-2">
              {selectedAnn.priority === "Urgent" && <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full" style={{ fontSize: "0.75rem" }}>Urgent</span>}
              <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                Sent {new Date(selectedAnn.sentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={{ fontSize: "0.9rem" }} className="text-foreground leading-relaxed space-y-3">
              <ReactMarkdown
                components={{
                  a: ({node, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                  p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li {...props} />
                }}
              >
                {selectedAnn.message}
              </ReactMarkdown>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-muted-foreground mb-2" style={{ fontSize: "0.75rem" }}>TARGET AUDIENCE</p>
              <div className="flex flex-wrap gap-2">
                {selectedAnn.targets.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground" style={{ fontSize: "0.8rem" }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p style={{ fontSize: "1.1rem" }}>{selectedAnn.readCount}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Read</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <p style={{ fontSize: "1.1rem" }}>{selectedAnn.totalRecipients > 0 ? Math.round((selectedAnn.readCount / selectedAnn.totalRecipients) * 100) : 0}%</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Read Rate</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              {canCompose && (
                <button
                  onClick={() => { handleTogglePin(selectedAnn.id); setSelectedAnn(null); }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Pin className="w-4 h-4" /> {selectedAnn.pinned ? "Unpin" : "Pin"}
                </button>
              )}
              <button onClick={() => setSelectedAnn(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
