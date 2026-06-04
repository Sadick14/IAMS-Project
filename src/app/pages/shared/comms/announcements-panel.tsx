import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../../lib/context";
import { apiClient } from "../../../lib/api-client";
import { TARGET_ROLE_MAP } from "../../../components/announcement-composer";
import { Megaphone, Send, Pin, X, Eye, Clock, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../../services/auth-service";
import { AnnouncementComposer } from "../../../components/announcement-composer";
import ReactMarkdown from "react-markdown";

interface Props {
  viewRole: ExtendedRole;
  canCompose: boolean;
}

export function AnnouncementsPanel({ viewRole, canCompose }: Props) {
  const { user } = useAppContext();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedAnn, setSelectedAnn] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getAnnouncements({ per_page: 50 });
    if (res.success) setAnnouncements(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async (data: {
    title: string;
    message: string;
    priority: "low" | "normal" | "high" | "urgent";
    sendInApp: boolean;
    sendEmail: boolean;
    targets: string[];
    student_level?: number;
    term_type?: string;
    placement_status?: string;
  }) => {
    const isEveryone = data.targets.includes("Everyone");
    const roles = isEveryone
      ? undefined
      : data.targets.map((t) => TARGET_ROLE_MAP[t]).filter((r): r is string => !!r);

    const deptScoped = viewRole === "dlo" || data.targets.some((t) => t.includes("my department"));

    const res = await apiClient.createAnnouncement({
      title: data.title,
      message: data.message,
      priority: data.priority,
      target_roles: roles,
      target_department_id: deptScoped ? ((user as any)?.department_id ?? undefined) : undefined,
      student_level: data.student_level,
      term_type: data.term_type,
      placement_status: data.placement_status,
    });

    if (res.success) {
      toast.success("Announcement sent!");
      setShowCompose(false);
      load();
    } else {
      toast.error(res.message ?? "Failed to send announcement.");
    }
  };

  const handleMarkRead = async (id: string) => {
    await apiClient.markAnnouncementRead(id);
    setAnnouncements((prev) => prev.map((a) => String(a.id) === id ? { ...a, is_read: true } : a));
  };

  const handlePin = async (id: string) => {
    const res = await apiClient.pinAnnouncement(id);
    if (res.success) {
      setAnnouncements((prev) => prev.map((a) => String(a.id) === id ? { ...a, pinned: (res.data as any)?.pinned ?? !a.pinned } : a));
      toast.success("Pin updated.");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiClient.deleteAnnouncement(id);
    if (res.success) {
      setAnnouncements((prev) => prev.filter((a) => String(a.id) !== id));
      setSelectedAnn(null);
      toast.success("Announcement deleted.");
    } else {
      toast.error(res.message ?? "Failed to delete.");
    }
  };

  const filtered = announcements.filter((a) =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase())
  );

  const pinned   = filtered.filter((a) => a.pinned);
  const regular  = filtered.filter((a) => !a.pinned);
  const total    = announcements.length;
  const unread   = announcements.filter((a) => !a.is_read).length;
  const urgentCt = announcements.filter((a) => a.priority === "urgent" || a.priority === "high").length;

  const readRate = total > 0
    ? Math.round(announcements.reduce((s, a) => s + (a.reads_count > 0 ? 1 : 0), 0) / total * 100)
    : 0;

  const AnnCard = ({ ann, pinBg }: { ann: any; pinBg?: boolean }) => (
    <div
      className={`border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
        pinBg ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
               : ann.is_read ? "bg-card border-border" : "bg-primary/5 border-primary/30"
      }`}
      onClick={() => { setSelectedAnn(ann); if (!ann.is_read) handleMarkRead(String(ann.id)); }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {ann.pinned && <Pin className="w-4 h-4 text-amber-600 shrink-0" />}
          {!ann.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <span className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{ann.title}</span>
          {(ann.priority === "urgent" || ann.priority === "high") && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full shrink-0" style={{ fontSize: "0.65rem" }}>
              {ann.priority}
            </span>
          )}
        </div>
        <span className="text-muted-foreground shrink-0 ml-2" style={{ fontSize: "0.72rem" }}>
          {new Date(ann.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      <div className="text-muted-foreground line-clamp-2 [&>p]:inline" style={{ fontSize: "0.85rem" }}>
        <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} />, a: ({node, ...props}) => <span className="text-primary" {...props} />, strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} /> }}>
          {ann.message}
        </ReactMarkdown>
      </div>
      {canCompose && (
        <div className="flex items-center gap-3 mt-2">
          <span className="ml-auto text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
            <Eye className="w-3 h-3" /> {ann.reads_count ?? 0} read{ann.reads_count !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {canCompose
            ? `${viewRole === "clo" ? "Institution-wide" : "Department"} announcements · ${total} total`
            : "Announcements from administration"}
          {unread > 0 && <span className="ml-2 text-primary font-medium">· {unread} unread</span>}
        </p>
        {canCompose && (
          <button onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            style={{ fontSize: "0.8rem" }}>
            <Megaphone className="w-3.5 h-3.5" /> New Announcement
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Sent",  value: total,    color: "text-blue-600 bg-blue-50",   icon: Send },
          { label: "Pinned",      value: pinned.length, color: "text-amber-600 bg-amber-50", icon: Pin },
          { label: "Urgent/High", value: urgentCt, color: "text-red-600 bg-red-50",     icon: Clock },
          { label: "Unread (you)",value: unread,   color: "text-emerald-600 bg-emerald-50", icon: Eye },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.25rem" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground" style={{ fontSize: "0.85rem" }}>Loading…</div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold"><Pin className="w-4 h-4 text-amber-600" /> Pinned</h3>
              <div className="space-y-3">{pinned.map((a) => <AnnCard key={a.id} ann={a} pinBg />)}</div>
            </div>
          )}

          <div>
            {pinned.length > 0 && <h3 className="mb-3 text-sm font-semibold">All Announcements</h3>}
            {regular.length === 0 && pinned.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                  {search ? "No announcements match your search." : "No announcements yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">{regular.map((a) => <AnnCard key={a.id} ann={a} />)}</div>
            )}
          </div>
        </>
      )}

      {/* Compose modal */}
      {showCompose && (
        <AnnouncementComposer viewRole={viewRole} onClose={() => setShowCompose(false)} onSend={handleSend} />
      )}

      {/* Detail modal */}
      {selectedAnn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAnn(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">{selectedAnn.title}</h2>
              </div>
              <button onClick={() => setSelectedAnn(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(selectedAnn.priority === "urgent" || selectedAnn.priority === "high") && (
                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full capitalize" style={{ fontSize: "0.75rem" }}>{selectedAnn.priority}</span>
              )}
              <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                {new Date(selectedAnn.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              {selectedAnn.sender?.name && (
                <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>· by {selectedAnn.sender.name}</span>
              )}
            </div>

            <div className="text-foreground leading-relaxed space-y-3 max-h-48 overflow-y-auto" style={{ fontSize: "0.9rem" }}>
              <ReactMarkdown components={{
                a: ({node, ...props}) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                li: ({node, ...props}) => <li {...props} />,
              }}>
                {selectedAnn.message}
              </ReactMarkdown>
            </div>

            {canCompose && (
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
                  <Eye className="w-4 h-4" /> {selectedAnn.reads_count ?? 0} read{selectedAnn.reads_count !== 1 ? "s" : ""}
                </span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => handlePin(String(selectedAnn.id))}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1.5" style={{ fontSize: "0.82rem" }}>
                    <Pin className="w-4 h-4" /> {selectedAnn.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => handleDelete(String(selectedAnn.id))}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1.5" style={{ fontSize: "0.82rem" }}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button onClick={() => setSelectedAnn(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
