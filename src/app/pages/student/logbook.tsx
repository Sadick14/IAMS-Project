import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import {
  Plus, BookMarked, Calendar, CheckCircle2, Clock, AlertTriangle,
  X, Upload, Eye, FileText, ChevronDown, ChevronUp, ExternalLink,
  Edit2, Trash2, ZoomIn
} from "lucide-react";
import { toast } from "sonner";
import { isActiveInternshipStatus, isCheckedInAttendanceRecord } from "../../hooks/use-student-check-in";

export function LogbookPage() {
  const [internshipId, setInternshipId] = useState<number | null>(null);
  const [internshipStatus, setInternshipStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const [entries, setEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [viewingEntry, setViewingEntry] = useState<any | null>(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});

  const [attachedFileName, setAttachedFileName] = useState<string>("");
  const [attachedFileUrl, setAttachedFileUrl] = useState<string>("");
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
    try {
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
        const sorted = [...(logsRes.data || [])].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
        setEntries(sorted);
      }

      // Check today's attendance from localStorage first, then API
      if (isActiveInternshipStatus(status)) {
        const today = new Date().toISOString().split("T")[0];

        // Check localStorage first for immediate feedback
        const localKey = `check_in_${id}_${today}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          console.log("Logbook: Found local check-in data");
          setCheckedInToday(true);
        } else {
          // Fall back to API
          const attRes = await apiClient.getInternshipAttendance(String(id), { from_date: today, to_date: today });
          if (attRes.success) {
            const records = Array.isArray(attRes.data) ? attRes.data : [];
            setCheckedInToday(records.some(isCheckedInAttendanceRecord));
          }
        }
      }
    } catch (error) {
      console.error("Error loading logbook data:", error);
    }
  }, []);

  // Auto-submit draft entries from previous days
  const autoSubmitPreviousDayDrafts = useCallback(async () => {
    if (!internshipId) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Find all draft entries that are NOT from today
      const previousDayDrafts = entries.filter(
        (e) => (e.status === "draft" || !e.status) && e.entry_date < today
      );

      if (previousDayDrafts.length === 0) return;

      console.log(`Auto-submitting ${previousDayDrafts.length} draft entries from previous days`);

      // Auto-submit each previous day's draft
      for (const entry of previousDayDrafts) {
        try {
          await apiClient.submitLogbookEntry(entry.id);
          console.log(`Auto-submitted entry ${entry.id} from ${entry.entry_date}`);
        } catch (error) {
          console.error(`Failed to auto-submit entry ${entry.id}:`, error);
        }
      }

      // Reload data after auto-submission
      loadData();
      toast.info(`${previousDayDrafts.length} previous day draft(s) auto-submitted for review`);
    } catch (error) {
      console.error("Error auto-submitting previous day drafts:", error);
    }
  }, [internshipId, entries, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for previous day drafts on mount and periodically
  useEffect(() => {
    autoSubmitPreviousDayDrafts();

    // Check every minute for day changes
    const interval = setInterval(() => {
      autoSubmitPreviousDayDrafts();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoSubmitPreviousDayDrafts]);

  // Listen for check-in updates from modal
  useEffect(() => {
    const handleCheckInUpdate = () => {
      console.log("Logbook: Check-in detected, reloading data");
      loadData();
    };

    window.addEventListener("checkInUpdated", handleCheckInUpdate);
    return () => window.removeEventListener("checkInUpdated", handleCheckInUpdate);
  }, [loadData]);

  const isLogbookActive = isActiveInternshipStatus(internshipStatus);

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
    const existingToday = entries.find((e) => e.entry_date === today);

    if (existingToday) {
      handleEditEntry(existingToday);
      return;
    }

    if (!checkedInToday) {
      toast.error("Please check in first before creating a logbook entry");
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
    setShowForm(true);
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

  const handleSave = async () => {
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
        status: "draft",
      } as any;

      let res;
      if (editingEntry) {
        res = await apiClient.updateLogbookEntry(editingEntry.id, payload);
      } else {
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
      successMessage: "Entry saved as draft!",
      errorMessage: "Failed to save logbook entry.",
    });
  };

  const handleSubmitForReview = async (entryId: string) => {
    await submitLogEntry(async () => {
      const res = await apiClient.submitLogbookEntry(entryId);
      if (res.success) {
        loadData();
      }
      return res;
    }, {
      successMessage: "Entry submitted for review!",
      errorMessage: "Failed to submit entry for review.",
    });
  };

  const getWeekStatusBadge = (weekEntries: any[]) => {
    const statuses = weekEntries.map(e => e.status?.toLowerCase() || "draft");
    if (statuses.includes("revision_requested")) {
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

      {internshipId && !isLogbookActive && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-semibold text-sm">
              {internshipStatus === "completed" ? "Completed" : "Not Active"}
            </p>
            <p className="text-red-700 text-xs mt-0.5">
              {internshipStatus === "completed" ? "Internship completed." : "Cannot create entries."}
            </p>
          </div>
        </div>
      )}

      {!internshipId && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No active internship found.</p>
        </div>
      )}

      {internshipId && entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No logbook entries recorded yet. Check in first, then click + to add one.</p>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {sortedWeekNumbers.map((wk) => {
            const weekEntries = groupedWeeks[wk] || [];
            const isCollapsed = !!collapsedWeeks[wk];

            return (
              <div key={wk} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
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
                  {getWeekStatusBadge(weekEntries)}
                </div>

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
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleEditEntry(entry)}
                                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Activities</p>
                          <p className="text-sm text-foreground whitespace-pre-line line-clamp-3">{entry.activities_description}</p>
                          {entry.activities_description && entry.activities_description.length > 200 && (
                            <button
                              onClick={() => setViewingEntry(entry)}
                              className="text-xs text-primary hover:underline mt-1"
                            >
                              Read full entry →
                            </button>
                          )}
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

                        {(entry.attachment_url || entry.attachmentName) && (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setPreviewUrl(entry.attachment_url || entry.attachmentUrl);
                                setPreviewName(entry.attachment_name || entry.attachmentName || "Attachment");
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-lg bg-card text-xs text-primary hover:bg-primary/5 transition-colors font-medium"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{entry.attachment_name || entry.attachmentName || "Attachment"}</span>
                              <Eye className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        )}

                        {(entry.industry_supervisor_comment || entry.academic_supervisor_comment) && (
                          <div className={`rounded-xl p-3 border text-xs leading-relaxed ${
                            entry.status === "rejected" ? "bg-red-50/50 border-red-200 text-red-700" : "bg-emerald-50/50 border-emerald-200 text-emerald-700"
                          }`}>
                            <p className="font-semibold mb-1">Supervisor Comment:</p>
                            {entry.industry_supervisor_comment ?? entry.academic_supervisor_comment}
                          </div>
                        )}

                        {(!entry.status || entry.status === "draft") && (
                          <div className="pt-2">
                            <button
                              onClick={() => handleSubmitForReview(entry.id)}
                              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Submit for Review
                            </button>
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

      {/* Entry Form Modal */}
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
                <h3 className="font-bold text-lg">{editingEntry ? "Edit Entry" : "New Entry"}</h3>
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
                <label className="text-xs font-semibold text-muted-foreground">Activities *</label>
                <textarea value={form.activities_description} onChange={(e) => setForm({ ...form, activities_description: e.target.value })}
                  placeholder="Describe what you did today..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[120px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Skills</label>
                <input type="text" value={form.skills_learned} onChange={(e) => setForm({ ...form, skills_learned: e.target.value })}
                  placeholder="e.g., React, TypeScript"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Challenges</label>
                <textarea value={form.challenges_faced} onChange={(e) => setForm({ ...form, challenges_faced: e.target.value })}
                  placeholder="Any blockers or issues..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[80px] text-sm" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Attachment (Optional)</label>
                <div className="border border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition-colors">
                  <label className="cursor-pointer flex flex-col items-center gap-1.5">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">
                      {attachedFileName ? attachedFileName : "Click to select file"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">PDF, PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.txt"
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
                <button type="button" onClick={handleSave} disabled={isSubmitting || !form.activities_description.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold text-sm transition-opacity disabled:opacity-50">
                  Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
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
              {previewUrl.startsWith("blob:") || previewName.endsWith(".png") || previewName.endsWith(".jpg") ? (
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-[60vh] rounded-lg object-contain" />
              ) : (
                <div className="text-center space-y-4">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Document: {previewName}</p>
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

      {/* View Entry Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingEntry(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Entry</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {new Date(viewingEntry.entry_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <button onClick={() => setViewingEntry(null)} className="p-1 rounded-md hover:bg-accent text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
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

              {viewingEntry.activities_description && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Activities</p>
                  <p className="text-foreground whitespace-pre-line">{viewingEntry.activities_description}</p>
                </div>
              )}

              {viewingEntry.skills_learned && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {String(viewingEntry.skills_learned).split(",").map((s: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewingEntry.challenges_faced && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Challenges</p>
                  <p className="text-muted-foreground">{viewingEntry.challenges_faced}</p>
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
    </div>
  );
}
