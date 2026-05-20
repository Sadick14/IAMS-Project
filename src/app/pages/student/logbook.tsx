import { useState, useEffect, useMemo } from "react";
import { useAppContext } from "../../lib/context";
import { getStudentApplicationHistory } from "../../lib/store";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import { Plus, BookMarked, Calendar, CheckCircle2, Clock, AlertTriangle, X, AlertCircle } from "lucide-react";
import { hasCheckedInToday, subscribeAttendance } from "../../services/attendance-service";
import { CheckInModal } from "../../components/check-in-modal";

export function LogbookPage() {
  const { user, store } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    activities: "",
    skills: "",
    challenges: "",
    checkInType: "gps" as "gps" | "manual",
    locationDetails: "",
  });

  const { execute: submitLogEntry, loading: isSubmitting } = useToastAction();

  // Track check-in status reactively
  const [checkedInToday, setCheckedInToday] = useState(false);
  useEffect(() => {
    if (user?.studentId) {
      const updateCheckInStatus = () => {
        setCheckedInToday(hasCheckedInToday(user.studentId || ""));
      };
      updateCheckInStatus();
      subscribeAttendance(updateCheckInStatus);
    }
  }, [user]);

  const handleNewEntry = () => {
    if (!checkedInToday) {
      setCheckInModalOpen(true);
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!checkedInToday) {
      setCheckInModalOpen(true);
      return;
    }

    const payload = {
      studentId: user?.studentId || "",
      date: form.date,
      activities: form.activities,
      skills: form.skills,
      challenges: form.challenges,
    };

    const res = await submitLogEntry(async () => {
      return apiClient.submitLogbook(payload);
    }, {
      successMessage: "Logbook entry submitted successfully!",
      errorMessage: "Failed to submit logbook entry.",
    });

    if (res?.success) {
      setForm({
        date: new Date().toISOString().split("T")[0],
        activities: "",
        skills: "",
        challenges: "",
        checkInType: "gps",
        locationDetails: "",
      });
      setShowForm(false);
    }
  };

  // Filter entries reactively from global store
  const entries = useMemo(() => {
    return store.logbookEntries.filter((e) => e.studentId === user?.studentId);
  }, [store.logbookEntries, user?.studentId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Daily Logbook</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Record your daily internship activities
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewEntry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {/* Check-in Warning */}
      {!checkedInToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-800 dark:text-amber-300 font-semibold" style={{ fontSize: "0.9rem" }}>
              Check-in Required
            </h4>
            <p className="text-amber-700 dark:text-amber-400 mt-1" style={{ fontSize: "0.8rem" }}>
              You must check in for the day before creating logbook entries. Click the button below to check in.
            </p>
            <button
              type="button"
              onClick={() => setCheckInModalOpen(true)}
              className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold transition-colors"
            >
              Check In Now
            </button>
          </div>
        </div>
      )}

      {/* New Entry Form - Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Form loading blocker */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm font-medium">Submitting logbook entry...</p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3>New Logbook Entry</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-md hover:bg-accent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Activities Performed *</label>
                <textarea
                  value={form.activities}
                  onChange={(e) => setForm({ ...form, activities: e.target.value })}
                  placeholder="Describe what you did today..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[120px]"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Skills Learned</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g., Python scripting, Network config, Customer service"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Challenges</label>
                <textarea
                  value={form.challenges}
                  onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                  placeholder="Any difficulties or blockers..."
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-card min-h-[80px]"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium"
                  style={{ fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-50"
                  style={{ fontSize: "0.85rem" }}
                >
                  Submit Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No logbook entries yet</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            Start recording your daily internship activities.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p style={{ fontSize: "0.85rem" }} className="font-semibold">
                    {entry.date}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                    entry.approvalStatus === "Approved"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : entry.approvalStatus === "Revision Requested"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {entry.approvalStatus === "Approved" && <CheckCircle2 className="w-3 h-3" />}
                  {entry.approvalStatus === "Pending" && <Clock className="w-3 h-3" />}
                  {entry.approvalStatus === "Revision Requested" && <AlertTriangle className="w-3 h-3" />}
                  {entry.approvalStatus}
                </span>
              </div>
              <div>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Activities
                </p>
                <p style={{ fontSize: "0.85rem" }} className="text-foreground leading-relaxed">
                  {entry.activities}
                </p>
              </div>
              {entry.skills && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {entry.skills.split(",").map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 bg-secondary rounded-lg text-secondary-foreground text-xs font-medium border border-border"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entry.challenges && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Challenges
                  </p>
                  <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground leading-relaxed">
                    {entry.challenges}
                  </p>
                </div>
              )}
              {entry.supervisorComment && (
                <div
                  className={`rounded-xl p-3 border mt-2 ${
                    entry.approvalStatus === "Revision Requested"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                      : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  }`}
                >
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Supervisor Feedback
                  </p>
                  <p
                    style={{ fontSize: "0.8rem" }}
                    className={
                      entry.approvalStatus === "Revision Requested"
                        ? "text-red-700 dark:text-red-400 leading-relaxed font-medium"
                        : "text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium"
                    }
                  >
                    {entry.supervisorComment}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Daily Check-In Modal */}
      <CheckInModal isOpen={checkInModalOpen} onClose={() => setCheckInModalOpen(false)} />
    </div>
  );
}