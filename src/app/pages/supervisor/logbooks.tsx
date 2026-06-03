import { useState, useEffect, useCallback } from "react";
import { SkeletonList } from "../../components/skeleton";
import { apiClient } from "../../lib/api-client";
import {
  BookMarked, CheckCircle2, RotateCcw, Calendar, X, Clock, AlertTriangle,
  ChevronDown, ChevronUp, FileText, Eye, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export function SupervisorLogbooksPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getLogbookEntries({ per_page: 100 });
    if (res.success) setEntries(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const studentName = (e: any) => e.internship?.student?.user?.name ?? "—";
  const studentNum  = (e: any) => e.internship?.student?.student_id ?? "—";

  let filtered = [...entries];
  if (filterStatus !== "All") {
    filtered = filtered.filter((e) => e.status === filterStatus);
  }
  filtered.sort((a, b) => {
    if (a.status === "submitted" && b.status !== "submitted") return -1;
    if (a.status !== "submitted" && b.status === "submitted") return 1;
    return String(b.entry_date).localeCompare(String(a.entry_date));
  });

  const pendingCount  = entries.filter((e) => e.status === "submitted").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;
  const rejectedCount = entries.filter((e) => e.status === "rejected").length;

  const handleApprove = async (entryId: string) => {
    const res = await apiClient.approveLogbook(entryId, approvalComment || undefined);
    if (res.success) {
      toast.success(res.message ?? "Logbook entry approved.");
      setApprovalComment(""); setExpandedEntry(null);
      fetchEntries();
    } else {
      toast.error(res.message ?? "Failed to approve.");
    }
  };

  const handleRequestRevision = async (entryId: string) => {
    const res = await apiClient.requestLogbookRevision(entryId, revisionComment);
    if (res.success) {
      toast.success(res.message ?? "Revision requested.");
      setRevisionComment(""); setShowRevisionModal(null); setExpandedEntry(null);
      fetchEntries();
    } else {
      toast.error(res.message ?? "Failed to request revision.");
    }
  };

  const handleBulkApprove = async () => {
    const pending = filtered.filter((e) => e.status === "submitted");
    let approved = 0;
    for (const entry of pending) {
      const res = await apiClient.approveLogbook(String(entry.id));
      if (res.success) approved++;
    }
    toast.success(`${approved} logbook entr${approved === 1 ? "y" : "ies"} approved.`);
    fetchEntries();
  };

  const statusColors: Record<string, string> = {
    submitted: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-600",
  };
  const statusIcons: Record<string, React.ReactNode> = {
    submitted: <Clock className="w-3.5 h-3.5" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5" />,
    rejected: <AlertTriangle className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Student Logbook Review</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Review and approve daily logbook entries from your assigned students
          </p>
        </div>
        {pendingCount > 0 && (
          <button onClick={handleBulkApprove}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            style={{ fontSize: "0.85rem" }}>
            <CheckCircle2 className="w-4 h-4" /> Approve All Pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-amber-800" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{pendingCount}</p>
          <p className="text-amber-600 mt-1" style={{ fontSize: "0.8rem" }}>Pending Review</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{approvedCount}</p>
          <p className="text-emerald-600 mt-1" style={{ fontSize: "0.8rem" }}>Approved</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-red-800" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{rejectedCount}</p>
          <p className="text-red-600 mt-1" style={{ fontSize: "0.8rem" }}>Revision Requested</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {["All", "submitted", "approved", "rejected"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg border transition-colors capitalize ${
              filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
            }`} style={{ fontSize: "0.8rem" }}>
            {s === "submitted" ? "Pending" : s === "rejected" ? "Revision" : s}
          </button>
        ))}
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3>Request Revision</h3>
              <button onClick={() => { setShowRevisionModal(null); setRevisionComment(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
              The student will be notified to revise and resubmit this entry.
            </p>
            <div>
              <label style={{ fontSize: "0.8rem" }}>Reason for Revision *</label>
              <textarea value={revisionComment} onChange={(e) => setRevisionComment(e.target.value)}
                placeholder="Explain what needs to be changed or added..."
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background min-h-[100px]" style={{ fontSize: "0.85rem" }} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowRevisionModal(null); setRevisionComment(""); }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={() => handleRequestRevision(showRevisionModal)} disabled={!revisionComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50" style={{ fontSize: "0.85rem" }}>
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No logbook entries found</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            {filterStatus !== "All" ? `No ${filterStatus} entries.` : "Students haven't submitted any logbook entries yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry: any) => {
            const isExpanded = expandedEntry === String(entry.id);
            return (
              <div key={entry.id} className={`bg-card border rounded-xl transition-colors ${entry.status === "submitted" ? "border-amber-200" : "border-border"}`}>
                <div onClick={() => setExpandedEntry(isExpanded ? null : String(entry.id))} className="w-full text-left p-5 flex items-center gap-4 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.8rem" }}>
                    {studentName(entry).split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span style={{ fontSize: "0.9rem" }}>{studentName(entry)}</span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{studentNum(entry)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                        <Calendar className="w-3 h-3" /> {entry.entry_date}
                      </span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${statusColors[entry.status]}`} style={{ fontSize: "0.65rem" }}>
                        {statusIcons[entry.status]} {entry.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate mt-1" style={{ fontSize: "0.8rem" }}>{entry.activities_description}</p>
                  </div>
                  {entry.status === "submitted" && (
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleApprove(String(entry.id))}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => setShowRevisionModal(String(entry.id))}
                        className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Revise
                      </button>
                    </div>
                  )}
                  <div className="shrink-0 ml-2 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 border-t border-border space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div>
                        <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider mb-1">Activities Performed</p>
                        <p style={{ fontSize: "0.85rem" }}>{entry.activities_description}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider mb-1">Skills Learned</p>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.skills_learned ? String(entry.skills_learned).split(",").map((s: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground" style={{ fontSize: "0.7rem" }}>{s.trim()}</span>
                          )) : <span className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>None recorded</span>}
                        </div>
                      </div>
                    </div>
                    {entry.challenges_faced && (
                      <div>
                        <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider mb-1">Challenges</p>
                        <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground">{entry.challenges_faced}</p>
                      </div>
                    )}
                    {(entry.attachment_url || entry.attachmentName || entry.attachment_name) && (
                      <div>
                        <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider mb-1">Evidence / Attachment</p>
                        <div className="pt-1">
                          <button
                            onClick={() => {
                              setPreviewUrl(entry.attachment_url || entry.attachmentUrl);
                              setPreviewName(entry.attachment_name || entry.attachmentName || "Logbook Attachment");
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-lg bg-card text-xs text-primary hover:bg-primary/5 transition-colors font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{entry.attachment_name || entry.attachmentName || "Attachment"}</span>
                            <Eye className="w-3 h-3 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    )}
                    {entry.status === "submitted" && (
                      <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                        <div>
                          <label style={{ fontSize: "0.8rem" }}>Comment (optional)</label>
                          <input type="text" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)}
                            placeholder="Add a note for the student..."
                            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(String(entry.id))}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700" style={{ fontSize: "0.85rem" }}>
                            <CheckCircle2 className="w-4 h-4" /> Approve Entry
                          </button>
                          <button onClick={() => setShowRevisionModal(String(entry.id))}
                            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50" style={{ fontSize: "0.85rem" }}>
                            <RotateCcw className="w-4 h-4" /> Request Revision
                          </button>
                        </div>
                      </div>
                    )}
                    {(entry.industry_supervisor_comment || entry.academic_supervisor_comment) && (
                      <div className={`rounded-lg p-3 border ${entry.status === "rejected" ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                        <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider mb-1">Supervisor Feedback</p>
                        <p style={{ fontSize: "0.8rem" }} className={entry.status === "rejected" ? "text-red-700" : "text-emerald-700"}>
                          {entry.industry_supervisor_comment ?? entry.academic_supervisor_comment}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground truncate max-w-[80%]">{previewName}</h3>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-black/5 min-h-[300px]">
              {previewUrl.startsWith("blob:") || previewName.endsWith(".png") || previewName.endsWith(".jpg") || previewName.endsWith(".jpeg") ? (
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-[60vh] rounded-lg object-contain" />
              ) : (
                <div className="text-center space-y-4">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Document attachment: {previewName}</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 animate-fade-in"
                  >
                    Open Document <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
