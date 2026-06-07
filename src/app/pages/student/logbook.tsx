import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import {
  Plus, BookMarked, Calendar, CheckCircle2, Clock, AlertTriangle,
  X, AlertCircle, Upload, Eye, FileText, ChevronDown, ChevronUp, Check, ExternalLink,
  Edit2, Trash2, ZoomIn
} from "lucide-react";
import { CheckInModal } from "../../components/check-in-modal";
import { toast } from "sonner";
import { isActiveInternshipStatus, isCheckedInAttendanceRecord, useStudentCheckIn } from "../../hooks/use-student-check-in";

export function LogbookPage() {
  const { user } = useAppContext();
  const { refresh: refreshCheckInStatus } = useStudentCheckIn(user?.role === "student");

  const [internshipId, setInternshipId] = useState<number | null>(null);
  const [internshipStatus, setInternshipStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  
  const [entries, setEntries] = useState<any[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [viewingEntry, setViewingEntry] = useState<any | null>(null);

  // Weekly collapsible state
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});

  // Attachments State
  const [attachedFileName, setAttachedFileName] = useState<string>("");
  const [attachedFileUrl, setAttachedFileUrl] = useState<string>("");

  // Preview Modal State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    activities_description: "",
    skills_learned: "",
    challenges_faced: "",
  });

  const { execute: submitLogEntry, loading: isSubmitting } = useToastAction();

  const loadData = useCallback(async () => {
    const dashRes = await apiClient.getDashboard("student");
    const activeInternship = dashRes.data?.active_internship;
    if (!activeInternship?.id) return;

    const id = Number(activeInternship.id);
    const status = activeInternship.status;
    const company = activeInternship.company?.name;
    const sDate = activeInternship.start_date || activeInternship.created_at || null;

    setInternshipId(id);
    setInternshipStatus(status);
    setCompanyName(company);
    setStartDate(sDate);

    // Fetch logbook entries
    const logsRes = await apiClient.getLogbookEntries({ internship_id: id, per_page: 100 });
    if (logsRes.success) {
      // Sort entries by date descending
      const sorted = [...(logsRes.data || [])].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      setEntries(sorted);
    }

    // Check today's attendance via API
    if (isActiveInternshipStatus(status)) {
      const today = new Date().toISOString().split("T")[0];
      try {
        const attRes = await apiClient.getInternshipAttendance(String(id), { from_date: today, to_date: today });
        if (attRes.success) {
          const records = Array.isArray(attRes.data) ? attRes.data : attRes.data?.attendance ?? [];
          const isCheckedIn = records.some(isCheckedInAttendanceRecord);
          setCheckedInToday(isCheckedIn);
        } else {
          console.warn("Failed to fetch attendance:", attRes.message);
          setCheckedInToday(false);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setCheckedInToday(false);
      }
    } else {
      setCheckedInToday(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isLogbookActive = isActiveInternshipStatus(internshipStatus);

  // Dynamic weekly grouping
  const getWeekNumber = (entryDate: string, internshipStart: string) => {
    if (!internshipStart) return 1;
    const start = new Date(internshipStart.split("T")[0]);
    const current = new Date(entryDate);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    return Math.floor(diffDays / 7) + 1;
  };

  const getWeekRange = (weekNum: number, internshipStart: string) => {
    if (!internshipStart) return "";
    const start = new Date(internshipStart.split("T")[0]);
    const weekStart = new Date(start.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  };

  // Group entries
  const groupedWeeks: Record<number, any[]> = {};
  if (startDate) {
    entries.forEach((entry) => {
      const wk = getWeekNumber(entry.entry_date, startDate);
      if (!groupedWeeks[wk]) groupedWeeks[wk] = [];
      groupedWeeks[wk].push(entry);
    });
  } else {
    groupedWeeks[1] = entries;
  }

  const sortedWeekNumbers = Object.keys(groupedWeeks)
    .map(Number)
    .sort((a, b) => b - a);

  const handleNewEntry = () => {
    if (!isLogbookActive) return;
    if (!internshipId) return;

    const today = new Date().toISOString().split("T")[0];

    // 👉 If an entry for today already exists, edit that entry instead of creating a new one
    const existingToday = entries.find((e) => e.entry_date === today);
    if (existingToday) {
      handleEditEntry(existingToday);
      return;
    }

    setEditingEntry(null);
    setForm({
      entry_date: today,
      activities_description: "",
      skills_learned: "",
      challenges_faced: "",
    });
    setAttachedFileName("");
    setAttachedFileUrl("");

    // 👉 Only show check‑in modal when the user hasn't checked‑in yet
    if (!checkedInToday) {
      setCheckInModalOpen(true);
    } else {
      setShowForm(true);
    }
  };

  const handleEditEntry = (entry: any) => {
    if (entry.status && entry.status !== "draft") {
      toast.error("Can only edit draft entries");
      return;
    }
    setEditingEntry(entry);
    setForm({
      entry_date: entry.entry_date,
      activities_description: entry.activities_description,
      skills_learned: entry.skills_learned || "",
      challenges_faced: entry.challenges_faced || "",
    });
    setAttachedFileName(entry.attachment_name || "");
    setAttachedFileUrl(entry.attachment_url || "");
    setShowForm(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm("Delete this entry? This cannot be undone.")) return;
    const res = await apiClient.deleteLogbookEntry(entryId);
    if (res.success) {
      toast.success("Entry deleted");
      loadData();
    } else {
      toast.error("Failed to delete entry");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File exceeds 5MB size limit.");
        return;
      }
      setAttachedFileName(file.name);
      setAttachedFileUrl(URL.createObjectURL(file));
      toast.success("Attachment selected successfully!");
    }
  };

  const handleSubmit = async () => {
    if (!isLogbookActive) return;
    if (!internshipId) return;

    await submitLogEntry(async () => {
      const payload = {
        internship_id: internshipId,
        entry_date: form.entry_date,
        activities_description: form.activities_description,
        skills_learned: form.skills_learned || undefined,
        challenges_faced: form.challenges_faced || undefined,
        attachment_name: attachedFileName || undefined,
        attachment_url: attachedFileUrl || undefined,
      } as any;

      let res;
      if (editingEntry) {
        // Update existing entry
        res = await apiClient.updateLogbookEntry(editingEntry.id, payload);
      } else {
        // Create new entry
        res = await apiClient.submitLogbook(payload);
      }

      if (res.success) {
        setForm({
          entry_date: new Date().toISOString().split("T")[0],
          activities_description: "",
          skills_learned: "",
          challenges_faced: "",
        });
        setAttachedFileName("");
        setAttachedFileUrl("");
        setEditingEntry(null);
        setShowForm(false);
        loadData();
      }
      return res;
    }, {
      successMessage: editingEntry ? "Entry updated successfully!" : "Logbook entry submitted successfully!",
      errorMessage: "Failed to submit logbook entry.",
    });
  };

  // Bulk Submit week for review
  const handleSubmitWeek = async (weekNum: number) => {
    const weekEntries = groupedWeeks[weekNum] || [];
    const draftEntries = weekEntries.filter(e => e.status === "draft" || !e.status);
    
    if (draftEntries.length === 0) {
      toast.info("No draft entries to submit in this week.");
      return;
    }

    const toastId = toast.loading(`Submitting Week ${weekNum} entries...`);
    
    try {
      // Simulate submitting all draft entries for this week
      for (const entry of draftEntries) {
        await apiClient.submitLogbook({
          internship_id: internshipId!,
          entry_date: entry.entry_date,
          activities_description: entry.activities_description,
          skills_learned: entry.skills_learned,
          challenges_faced: entry.challenges_faced,
          attachment_name: entry.attachment_name,
          attachment_url: entry.attachment_url,
          status: "submitted",
        } as any);
      }
      
      toast.dismiss(toastId);
      toast.success(`Week ${weekNum} logbook compiled and submitted to supervisor!`);
      loadData();
    } catch {
      toast.dismiss(toastId);
      toast.error("Failed to submit weekly review.");
    }
  };

  const getWeekStatusBadge = (weekEntries: any[]) => {
    const statuses = weekEntries.map(e => e.status?.toLowerCase() || "draft");
    if (statuses.includes("revision_requested") || statuses.includes("revision requested")) {
      return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">Revision Required</span>;
    }
    if (statuses.includes("draft")) {
      return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">Drafts Pending</span>;
    }
    if (statuses.every(s => s === "approved")) {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Approved</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">Submitted</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Daily Logbook</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {companyName ? `${companyName}` : "Record activities"}
          </p>
        </div>
      </div>

      {/* Internship Not Active Warning */}
      {internshipId && !isLogbookActive && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-semibold text-sm">
              {internshipStatus === "completed" ? "Completed" : "Not Active"}
            </p>
            <p className="text-red-700 text-xs mt-0.5">
              {internshipStatus === "completed" ? "Internship completed. View history for past entries." : "Cannot create entries. Status: " + internshipStatus}
            </p>
          </div>
        </div>
      )}


      {!internshipId && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No active internship found to write logbooks.</p>
        </div>
      )}

      {/* Accordion List of Weeks */}
      {internshipId && entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No logbook entries recorded yet. Click the + button to add one.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {sortedWeekNumbers.map((wk) => {
            const weekEntries = groupedWeeks[wk] || [];
            const isCollapsed = !!collapsedWeeks[wk];
            const hasDrafts = weekEntries.some(e => e.status === "draft" || !e.status);

            return (
              <div key={wk} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                
                {/* Week Header */}
                <div className="p-4 flex items-center justify-between gap-3 bg-muted/10">
                  <button
                    onClick={() => setCollapsedWeeks(p => ({ ...p, [wk]: !p[wk] }))}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <h3 className="font-bold text-sm">Week {wk}</h3>
                      {startDate && <p className="text-[10px] text-muted-foreground font-semibold">{getWeekRange(wk, startDate)}</p>}
                    </div>
                  </button>

                  <div className="flex items-center gap-2">
                    {getWeekStatusBadge(weekEntries)}
                    {hasDrafts && isLogbookActive && (
                      <button
                        onClick={() => handleSubmitWeek(wk)}
                        className="px-2.5 py-1 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-xs font-semibold transition-opacity flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Submit Week
                      </button>
                    )}
                  </div>
                </div>

                {/* Week Log List */}
                {!isCollapsed && (
                  <div className="divide-y divide-border border-t border-border">
                    {weekEntries.map((entry: any) => (
                      <div key={entry.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="font-semibold text-xs text-foreground">
                              {new Date(entry.entry_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              entry.status === "approved"  ? "bg-emerald-100 text-emerald-700" :
                              entry.status === "rejected"  ? "bg-red-100 text-red-700" :
                              entry.status === "submitted" ? "bg-blue-100 text-blue-700" :
                                                             "bg-amber-100 text-amber-700"
                            }`}>
                              {entry.status || "draft"}
                            </span>
                            {(!entry.status || entry.status === "draft") && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setViewingEntry(entry)}
                                  className="p-1 rounded hover:bg-blue-100 text-muted-foreground hover:text-blue-600 transition-colors"
                                  title="View entry"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEditEntry(entry)}
                                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Activities Performed</p>
                          <p className="text-sm text-foreground whitespace-pre-line">{entry.activities_description}</p>
                        </div>

                        {entry.skills_learned && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {String(entry.skills_learned).split(",").map((s: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-secondary text-secondary-foreground border border-border rounded text-[10px] font-medium">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {entry.challenges_faced && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Challenges</p>
                            <p className="text-xs text-muted-foreground">{entry.challenges_faced}</p>
                          </div>
                        )}

                        {/* Attachment display */}
                        {(entry.attachment_url || entry.attachmentName) && (
                          <div className="pt-2">
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
                        )}

                        {/* Supervisor Comment */}
                        {(entry.industry_supervisor_comment || entry.academic_supervisor_comment) && (
                          <div className={`rounded-xl p-3 border text-xs leading-relaxed ${
                            entry.status === "rejected" ? "bg-red-50/50 border-red-200 text-red-700" : "bg-emerald-50/50 border-emerald-200 text-emerald-700"
                          }`}>
                            <p className="font-semibold mb-1">Supervisor Comment:</p>
                            {entry.industry_supervisor_comment ?? entry.academic_supervisor_comment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom-6 duration-300" onClick={(e) => e.stopPropagation()}>
            {isSubmitting && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Submitting...</p>
                </div>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className="font-bold text-lg">{editingEntry ? "Edit Logbook Entry" : "New Logbook Entry"}</h3>
                <button type="button" onClick={() => { setShowForm(false); setEditingEntry(null); }} className="p-1 rounded-md hover:bg-accent text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Date</label>
                <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Activities Performed *</label>
                <textarea value={form.activities_description} onChange={(e) => setForm({ ...form, activities_description: e.target.value })}
                  placeholder="Describe what tasks you handled, issues solved, or concepts researched today..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Skills Acquired / Practiced</label>
                <input type="text" value={form.skills_learned} onChange={(e) => setForm({ ...form, skills_learned: e.target.value })}
                  placeholder="e.g., Database migrations, Git branching, React Hooks"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Challenges Encountered</label>
                <textarea value={form.challenges_faced} onChange={(e) => setForm({ ...form, challenges_faced: e.target.value })}
                  placeholder="Any technical issues, blockers, or gaps in requirements..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[80px] text-sm" />
              </div>

              {/* Document/Photo Attachment Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Attach Supporting Evidence (Optional)</label>
                  <div className="border border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition-colors">
                    <label className="cursor-pointer flex flex-col items-center gap-1.5">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {attachedFileName ? attachedFileName : "Click to select image or file"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">PDF, PNG, JPG, or TXT up to 5MB</span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.txt,.js,.ts,.tsx,.json"
                        className="hidden"
                      />
                    </label>
                  </div>
                {attachedFileName && (
                  <div className="flex items-center justify-between p-2.5 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-xs">
                    <span className="text-emerald-700 truncate max-w-[80%] font-medium">{attachedFileName}</span>
                    <button
                      type="button"
                      onClick={() => { setAttachedFileName(""); setAttachedFileUrl(""); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} disabled={isSubmitting}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent font-semibold text-sm text-foreground transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSubmitting || !form.activities_description.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold text-sm transition-opacity disabled:opacity-50">
                  Submit Entry
                </button>
              </div>
            </div>
          </div>
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
                    className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90"
                  >
                    Open Document <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Plus Button */}
      {internshipId && isLogbookActive && !showForm && (
        <button
          onClick={handleNewEntry}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* View Entry Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingEntry(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Logbook Entry</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {new Date(viewingEntry.entry_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <button onClick={() => setViewingEntry(null)} className="p-1 rounded-md hover:bg-accent text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  viewingEntry.status === "approved"  ? "bg-emerald-100 text-emerald-700" :
                  viewingEntry.status === "rejected"  ? "bg-red-100 text-red-700" :
                  viewingEntry.status === "submitted" ? "bg-blue-100 text-blue-700" :
                                                       "bg-amber-100 text-amber-700"
                }`}>
                  {viewingEntry.status || "draft"}
                </span>
              </div>

              {/* Activities */}
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Activities Performed</p>
                <p className="text-foreground whitespace-pre-line">{viewingEntry.activities_description}</p>
              </div>

              {/* Skills */}
              {viewingEntry.skills_learned && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Skills Acquired</p>
                  <div className="flex flex-wrap gap-2">
                    {String(viewingEntry.skills_learned).split(",").map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenges */}
              {viewingEntry.challenges_faced && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Challenges Faced</p>
                  <p className="text-muted-foreground">{viewingEntry.challenges_faced}</p>
                </div>
              )}

              {/* Supervisor Comments */}
              {(viewingEntry.industry_supervisor_comment || viewingEntry.academic_supervisor_comment) && (
                <div className={`rounded-lg p-4 border text-sm ${
                  viewingEntry.status === "rejected" ? "bg-red-50/50 border-red-200 text-red-700" : "bg-emerald-50/50 border-emerald-200 text-emerald-700"
                }`}>
                  <p className="font-semibold mb-1">Supervisor Comment:</p>
                  {viewingEntry.industry_supervisor_comment ?? viewingEntry.academic_supervisor_comment}
                </div>
              )}

              {/* Attachment */}
              {(viewingEntry.attachment_url || viewingEntry.attachmentName) && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Attachment</p>
                  <button
                    onClick={() => {
                      setViewingEntry(null);
                      setPreviewUrl(viewingEntry.attachment_url || viewingEntry.attachmentUrl);
                      setPreviewName(viewingEntry.attachment_name || viewingEntry.attachmentName || "Logbook Attachment");
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card text-primary hover:bg-primary/5 transition-colors font-medium text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    {viewingEntry.attachment_name || viewingEntry.attachmentName || "View Attachment"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <CheckInModal
    isOpen={checkInModalOpen}
    onClose={() => setCheckInModalOpen(false)}
    onSuccess={() => {
      // user is now checked‑in for today
      setCheckedInToday(true);
      // refresh the global check-in state in the header
      refreshCheckInStatus();
      // reload data (entries, attendance, etc.)
      loadData().then(() => {
        // open the entry form after data is fresh
        setTimeout(() => setShowForm(true), 100);
      });
    }}
    internshipId={internshipId ?? undefined}
    internshipStatus={internshipStatus ?? undefined}
  />
    </div>
  );
}
