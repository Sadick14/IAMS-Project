import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";

import { ScheduleVisitModal } from "../../components/academic/schedule-visit-modal";
import { RescheduleVisitModal } from "../../components/academic/reschedule-visit-modal";
import { CompleteVisitModal } from "../../components/academic/complete-visit-modal";
import { VisitListCard } from "../../components/academic/visit-list-card";

type FilterStatus = "All" | "Scheduled" | "Completed" | "Cancelled";

// Map backend site-visitation to the shape VisitListCard expects
function normalizeVisit(v: any) {
  const statusMap: Record<string, string> = { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled" };
  return {
    id: String(v.id),
    internshipId: String(v.internship_id ?? v.internship?.id ?? ""),
    studentId: v.internship?.student?.student_id ?? "—",
    studentName: v.internship?.student?.user?.name ?? "—",
    companyName: v.internship?.company?.name ?? "—",
    companyAddress: v.internship?.company?.address ?? "",
    date: v.visit_date,
    time: v.visit_time ?? "",
    status: statusMap[v.status] ?? "Scheduled",
    notes: v.visit_purpose ?? "",
    observations: v.observations ?? "",
    recommendations: v.recommendations ?? "",
  };
}

export function AcademicVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState<string | null>(null);
  const [rescheduleVisitId, setRescheduleVisitId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [visitsRes, internshipsRes] = await Promise.all([
      apiClient.getSiteVisitations({ per_page: 100 }),
      apiClient.getActiveInternships(),
    ]);
    if (visitsRes.success) setVisits(visitsRes.data.map(normalizeVisit));
    if (internshipsRes.success) setInternships(internshipsRes.data);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build student dropdown — value is the internship id (what the backend needs)
  const assignedStudents = internships.map((i: any) => ({
    studentId: String(i.id), // internship id used as the selector value
    studentName: i.student?.user?.name ?? "—",
    companyName: i.company?.name ?? "—",
  }));

  const { execute: visitAction, loading: visitLoading } = useToastAction();

  const filtered = filter === "All" ? visits : visits.filter((v) => v.status === filter);
  const today = new Date().toISOString().split("T")[0];
  const upcoming = visits.filter((v) => v.status === "Scheduled" && v.date >= today);
  const completed = visits.filter((v) => v.status === "Completed");

  const handleScheduleVisit = async (newVisit: { studentId: string; date: string; time: string; notes: string }) => {
    await visitAction(async () => {
      const res = await apiClient.createSiteVisitation({
        internship_id: Number(newVisit.studentId),
        visit_date: newVisit.date,
        visit_time: newVisit.time || undefined,
        visit_purpose: newVisit.notes || "Routine site visit",
      });
      if (res.success) { setShowNewForm(false); fetchData(); }
      return res;
    }, { successMessage: "Site visit scheduled.", errorMessage: "Failed to schedule visit." });
  };

  const handleCompleteVisit = async (
    visitId: string,
    completeData: { observations: string; ratings: Record<string, number> }
  ) => {
    await visitAction(async () => {
      const res = await apiClient.completeSiteVisitation(visitId, {
        observations: completeData.observations,
        student_performance_notes: completeData.observations,
      });
      if (!res.success) return res;

      const score = Object.values(completeData.ratings ?? {}).reduce((a, b) => a + Number(b), 0);
      await apiClient.submitSiteVisitationScore(visitId, {
        score,
        max_score: 30,
        comments: completeData.observations,
        criteria_breakdown: completeData.ratings,
      });

      setShowCompleteForm(null);
      fetchData();
      return res;
    }, { successMessage: "Visit completed and score submitted.", errorMessage: "Failed to complete visit." });
  };

  const handleCancelVisit = async (visitId: string) => {
    await visitAction(async () => {
      const res = await apiClient.cancelSiteVisitation(visitId);
      if (res.success) fetchData();
      return res;
    }, { successMessage: "Visit cancelled.", errorMessage: "Failed to cancel visit." });
  };

  const handleRescheduleVisit = async (rescheduleForm: { date: string; time: string; reason: string }) => {
    if (!rescheduleVisitId) return;
    await visitAction(async () => {
      const res = await apiClient.updateSiteVisitation(rescheduleVisitId, {
        visit_date: rescheduleForm.date,
        visit_time: rescheduleForm.time,
        visit_purpose: rescheduleForm.reason || undefined,
      });
      if (res.success) { setRescheduleVisitId(null); fetchData(); }
      return res;
    }, { successMessage: "Visit rescheduled.", errorMessage: "Failed to reschedule." });
  };

  const selectedRescheduleVisit = visits.find((v) => v.id === rescheduleVisitId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Site Visits</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Schedule, track, and record observations from company site visits
          </p>
        </div>
        <button onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium" style={{ fontSize: "0.85rem" }}>
          <Plus className="w-4 h-4" /> Schedule New Visit
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-blue-800" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{upcoming.length}</p>
          <p className="text-blue-600 mt-1" style={{ fontSize: "0.8rem" }}>Upcoming</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{completed.length}</p>
          <p className="text-emerald-600 mt-1" style={{ fontSize: "0.8rem" }}>Completed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{visits.length}</p>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>Total</p>
        </div>
      </div>

      <ScheduleVisitModal isOpen={showNewForm} onClose={() => setShowNewForm(false)} assignedStudents={assignedStudents} onSchedule={handleScheduleVisit} isLoading={visitLoading} />

      {/* Filter Tabs */}
      <div className="flex gap-1.5">
        {(["All", "Scheduled", "Completed", "Cancelled"] as FilterStatus[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg border transition-colors font-medium ${filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
            style={{ fontSize: "0.8rem" }}>
            {f}
          </button>
        ))}
      </div>

      <RescheduleVisitModal isOpen={!!rescheduleVisitId} onClose={() => setRescheduleVisitId(null)} visit={selectedRescheduleVisit} onReschedule={handleRescheduleVisit} isLoading={visitLoading} />
      <CompleteVisitModal isOpen={!!showCompleteForm} onClose={() => setShowCompleteForm(null)} onComplete={(d) => showCompleteForm && handleCompleteVisit(showCompleteForm, d)} isLoading={visitLoading} />

      {/* Visits List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No visits found</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            {filter !== "All" ? `No ${filter.toLowerCase()} visits.` : "Schedule your first site visit."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...filtered].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((visit) => (
            <VisitListCard
              key={visit.id}
              visit={visit}
              isExpanded={expandedVisit === visit.id}
              onToggleExpand={() => setExpandedVisit(expandedVisit === visit.id ? null : visit.id)}
              onCompleteClick={() => setShowCompleteForm(visit.id)}
              onRescheduleClick={() => setRescheduleVisitId(visit.id)}
              onCancelClick={() => handleCancelVisit(visit.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
