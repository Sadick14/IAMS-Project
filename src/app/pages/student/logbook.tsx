import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import { Plus, BookMarked, Calendar, CheckCircle2, Clock, AlertTriangle, X, AlertCircle } from "lucide-react";
import { CheckInModal } from "../../components/check-in-modal";

export function LogbookPage() {
  const { user } = useAppContext();

  const [internshipId, setInternshipId] = useState<number | null>(null);
  const [internshipStatus, setInternshipStatus] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    activities_description: "",
    skills_learned: "",
    challenges_faced: "",
  });

  const { execute: submitLogEntry, loading: isSubmitting } = useToastAction();

  const loadData = useCallback(async () => {
    // Get active internship from dashboard
    const dashRes = await apiClient.getDashboard("student");
    const activeInternship = dashRes.data?.active_internship;
    if (!activeInternship?.id) return;

    const id = Number(activeInternship.id);
    const status = activeInternship.status;
    const company = activeInternship.company?.name;

    setInternshipId(id);
    setInternshipStatus(status);
    setCompanyName(company);

    // Fetch logbook entries
    const logsRes = await apiClient.getLogbookEntries({ internship_id: id, per_page: 50 });
    if (logsRes.success) setEntries(logsRes.data);

    // Check today's attendance (only for active internships)
    if (status === "active" || status === "approved") {
      const today = new Date().toISOString().split("T")[0];
      const attRes = await apiClient.getInternshipAttendance(String(id), { from_date: today, to_date: today });
      if (attRes.success) {
        const records = Array.isArray(attRes.data) ? attRes.data : attRes.data?.attendance ?? [];
        setCheckedInToday(records.some((r: any) => ["present", "late", "half_day"].includes(r.status)));
      }
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isLogbookActive = internshipStatus === "active" || internshipStatus === "approved";

  const handleNewEntry = () => {
    if (!isLogbookActive) return; // Silent return, message shown in UI
    if (!internshipId) return;
    if (!checkedInToday) { setCheckInModalOpen(true); return; }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!isLogbookActive) return;
    if (!internshipId) return;
    if (!checkedInToday) { setCheckInModalOpen(true); return; }

    await submitLogEntry(async () => {
      const res = await apiClient.submitLogbook({
        internship_id: internshipId,
        entry_date: form.entry_date,
        activities_description: form.activities_description,
        skills_learned: form.skills_learned || undefined,
        challenges_faced: form.challenges_faced || undefined,
      });
      if (res.success) {
        setForm({ entry_date: new Date().toISOString().split("T")[0], activities_description: "", skills_learned: "", challenges_faced: "" });
        setShowForm(false);
        loadData();
      }
      return res;
    }, {
      successMessage: "Logbook entry submitted successfully!",
      errorMessage: "Failed to submit logbook entry.",
    });
  };

  const onCheckInSuccess = () => {
    setCheckedInToday(true);
    setCheckInModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Daily Logbook</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {companyName ? `Record your daily activities at ${companyName}` : "Record your daily internship activities"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewEntry}
          disabled={!isLogbookActive}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all ${
            isLogbookActive
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          style={{ fontSize: "0.85rem" }}
          title={!isLogbookActive ? "Logbook entries can only be created during an active internship" : ""}
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Internship Not Active Warning */}
      {internshipId && !isLogbookActive && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-red-800 font-semibold" style={{ fontSize: "0.9rem" }}>
              {internshipStatus === "completed" ? "Internship Period Completed" : "Internship Not Active"}
            </h4>
            <p className="text-red-700 mt-1" style={{ fontSize: "0.8rem" }}>
              {internshipStatus === "completed"
                ? "Your internship at " + companyName + " has been completed. You can no longer create new logbook entries. To view your archived logbook entries and other internship records, visit the Internship History page."
                : "Logbook entries can only be created during an active and approved internship. Your current internship status is: " + internshipStatus}
            </p>
            {internshipStatus === "completed" && (
              <a
                href="/student/history"
                className="mt-3 inline-flex px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
              >
                View Internship History
              </a>
            )}
          </div>
        </div>
      )}

      {/* Check-in Warning */}
      {!checkedInToday && internshipId && isLogbookActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-800 font-semibold" style={{ fontSize: "0.9rem" }}>Check-in Required</h4>
            <p className="text-amber-700 mt-1" style={{ fontSize: "0.8rem" }}>
              You must check in for the day before creating logbook entries.
            </p>
            <button
              type="button"
              onClick={() => setCheckInModalOpen(true)}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold"
            >
              Check In Now
            </button>
          </div>
        </div>
      )}

      {!internshipId && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <BookMarked className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            No active internship found. You need an approved internship to submit logbook entries.
          </p>
        </div>
      )}

      {/* New Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {isSubmitting && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Submitting...</p>
                </div>
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3>New Logbook Entry</h3>
                <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Date</label>
                <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Activities Performed *</label>
                <textarea value={form.activities_description} onChange={(e) => setForm({ ...form, activities_description: e.target.value })}
                  placeholder="Describe what you did today..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[120px]" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Skills Learned</label>
                <input type="text" value={form.skills_learned} onChange={(e) => setForm({ ...form, skills_learned: e.target.value })}
                  placeholder="e.g., Python scripting, Network config, Customer service"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Challenges</label>
                <textarea value={form.challenges_faced} onChange={(e) => setForm({ ...form, challenges_faced: e.target.value })}
                  placeholder="Any difficulties or blockers..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[80px]" style={{ fontSize: "0.85rem" }} />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowForm(false)} disabled={isSubmitting}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium" style={{ fontSize: "0.85rem" }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={isSubmitting || !form.activities_description.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50" style={{ fontSize: "0.85rem" }}>
                  Submit Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {internshipId && entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No logbook entries yet</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>Start recording your daily internship activities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <div key={entry.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p style={{ fontSize: "0.85rem" }} className="font-semibold">{entry.entry_date}</p>
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                  entry.status === "approved"  ? "bg-emerald-100 text-emerald-700" :
                  entry.status === "rejected"  ? "bg-red-100 text-red-700" :
                  entry.status === "submitted" ? "bg-blue-100 text-blue-700" :
                                                 "bg-amber-100 text-amber-700"
                }`} style={{ fontSize: "0.7rem" }}>
                  {entry.status === "approved"  && <CheckCircle2 className="w-3 h-3" />}
                  {entry.status === "submitted" && <Clock className="w-3 h-3" />}
                  {entry.status === "rejected"  && <AlertTriangle className="w-3 h-3" />}
                  {entry.status}
                </span>
              </div>

              <div>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Activities</p>
                <p style={{ fontSize: "0.85rem" }} className="leading-relaxed">{entry.activities_description}</p>
              </div>

              {entry.skills_learned && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {String(entry.skills_learned).split(",").map((s: string, i: number) => (
                      <span key={i} className="px-2.5 py-0.5 bg-secondary rounded-lg text-secondary-foreground border border-border" style={{ fontSize: "0.7rem" }}>
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {entry.challenges_faced && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Challenges</p>
                  <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground leading-relaxed">{entry.challenges_faced}</p>
                </div>
              )}

              {(entry.industry_supervisor_comment || entry.academic_supervisor_comment) && (
                <div className={`rounded-xl p-3 border mt-2 ${
                  entry.status === "rejected" ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                }`}>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Supervisor Feedback</p>
                  <p style={{ fontSize: "0.8rem" }} className={entry.status === "rejected" ? "text-red-700 font-medium" : "text-emerald-700 font-medium"}>
                    {entry.industry_supervisor_comment ?? entry.academic_supervisor_comment}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CheckInModal
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onSuccess={onCheckInSuccess}
        internshipId={internshipId ?? undefined}
        internshipStatus={internshipStatus ?? undefined}
      />
    </div>
  );
}
