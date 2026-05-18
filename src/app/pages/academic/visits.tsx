import { useState } from "react";
import { useAppContext } from "../../lib/context";
import { MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { sendNotification, sendAnnouncement } from "../../services/notification-service";
import { submitSiteVisitation } from "../../services/grading-service";
import { VisitationCriterionKey, VisitationCriterionRating } from "../../types/grading";

// Import custom subcomponents
import { ScheduleVisitModal } from "../../components/academic/schedule-visit-modal";
import { RescheduleVisitModal } from "../../components/academic/reschedule-visit-modal";
import { CompleteVisitModal } from "../../components/academic/complete-visit-modal";
import { VisitListCard } from "../../components/academic/visit-list-card";

interface SiteVisit {
  id: string;
  studentId: string;
  studentName: string;
  companyName: string;
  companyAddress: string;
  date: string;
  time: string;
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";
  notes?: string;
  observations?: string;
  ratings?: Record<VisitationCriterionKey, VisitationCriterionRating>;
  companyFeedback?: string;
  recommendations?: string;
  contactPerson?: string;
  contactPhone?: string;
  studentEngagement?: number;
}

const initialVisits: SiteVisit[] = [];

type FilterStatus = "All" | "Scheduled" | "Completed" | "Cancelled";

export function AcademicVisitsPage() {
  const { user, store } = useAppContext();
  const [visits, setVisits] = useState<SiteVisit[]>(initialVisits);
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState<string | null>(null);
  const [rescheduleVisitId, setRescheduleVisitId] = useState<string | null>(null);

  const notifyParties = (
    kind: "scheduled" | "rescheduled" | "cancelled",
    visit: SiteVisit,
    extra?: string
  ) => {
    const academicName = user?.name || "Academic Supervisor";
    const when = `${visit.date} at ${visit.time}`;
    const titleByKind = {
      scheduled: "Upcoming Site Visit",
      rescheduled: "Site Visit Rescheduled",
      cancelled: "Site Visit Cancelled",
    } as const;
    const studentMsg = {
      scheduled: `${academicName} has scheduled a site visit to ${visit.companyName} on ${when}. Please be present at your workstation.`,
      rescheduled: `${academicName} rescheduled your site visit to ${when}.${extra ? ` Reason: ${extra}` : ""}`,
      cancelled: `${academicName} cancelled the site visit previously set for ${when}.${extra ? ` Reason: ${extra}` : ""}`,
    }[kind];
    const supervisorMsg = {
      scheduled: `${academicName} will visit ${visit.companyName} on ${when} to meet with ${visit.studentName}. Contact: ${visit.contactPerson || "—"}.`,
      rescheduled: `The site visit for ${visit.studentName} at ${visit.companyName} has been rescheduled to ${when}.${extra ? ` Reason: ${extra}` : ""}`,
      cancelled: `The site visit for ${visit.studentName} at ${visit.companyName} on ${when} has been cancelled.${extra ? ` Reason: ${extra}` : ""}`,
    }[kind];

    // In-app notifications
    sendNotification("system", titleByKind[kind], studentMsg);
    sendNotification("system", titleByKind[kind], supervisorMsg);

    // Mocked email via the announcement log
    sendAnnouncement(
      titleByKind[kind],
      `${studentMsg}\n\n${supervisorMsg}`,
      academicName,
      [`Student: ${visit.studentName}`, `Industry Supervisor: ${visit.contactPerson || visit.companyName}`]
    );
  };

  // Students for scheduling
  const assignedStudents = store.applications.filter(
    (a) => (a.status === "Active") &&
      (a.supervisorAssigned === user?.name || a.department === user?.department)
  );

  const filtered = filter === "All" ? visits : visits.filter((v) => v.status === filter);
  const upcoming = visits.filter((v) => v.status === "Scheduled" && v.date >= new Date().toISOString().split("T")[0]);
  const completed = visits.filter((v) => v.status === "Completed");

  const handleScheduleVisit = (newVisit: { studentId: string; date: string; time: string; notes: string }) => {
    const student = assignedStudents.find((s) => s.studentId === newVisit.studentId);
    if (!student) return;
    const company = store.companies.find((c) => c.id === student.companyId);

    const visit: SiteVisit = {
      id: `v-${Date.now()}`,
      studentId: student.studentId,
      studentName: student.studentName,
      companyName: student.companyName,
      companyAddress: company?.address || "",
      date: newVisit.date,
      time: newVisit.time,
      status: "Scheduled",
      contactPerson: company?.contactPerson,
      contactPhone: company?.contactPhone,
      notes: newVisit.notes,
    };

    setVisits((prev) => [visit, ...prev]);
    setShowNewForm(false);

    notifyParties("scheduled", visit);
    toast.success(`Site visit scheduled. ${student.studentName} and the industry supervisor have been notified.`);
  };

  const handleCompleteVisit = (
    visitId: string,
    completeData: {
      observations: string;
      ratings: Record<VisitationCriterionKey, VisitationCriterionRating>;
    }
  ) => {
    const visit = visits.find((v) => v.id === visitId);
    if (!visit) return;
    
    // Call the grading service
    const actor = {
      id: user?.id || "u-academic",
      name: user?.name || "Academic Supervisor",
      role: "academic" as const,
      department: user?.department,
    };
    
    // Use the actual application ID. We have to look it up from store using studentId
    const app = store.applications.find(a => a.studentId === visit.studentId);
    if (app) {
      submitSiteVisitation(app.id, completeData.ratings, completeData.observations, actor);
    }
    
    setVisits((prev) =>
      prev.map((v) =>
        v.id === visitId
          ? {
              ...v,
              status: "Completed" as const,
              observations: completeData.observations,
              ratings: completeData.ratings,
            }
          : v
      )
    );
    setShowCompleteForm(null);
    toast.success("Visit marked as completed and scores submitted.");
  };

  const handleCancelVisit = (visitId: string) => {
    const visit = visits.find((v) => v.id === visitId);
    setVisits((prev) => prev.map((v) => v.id === visitId ? { ...v, status: "Cancelled" as const } : v));
    if (visit) notifyParties("cancelled", visit);
    toast.success("Visit cancelled. Student and industry supervisor notified.");
  };

  const handleRescheduleVisit = (rescheduleForm: { date: string; time: string; reason: string }) => {
    if (!rescheduleVisitId) return;
    const visit = visits.find((v) => v.id === rescheduleVisitId);
    if (!visit) return;
    const updated: SiteVisit = {
      ...visit,
      date: rescheduleForm.date,
      time: rescheduleForm.time,
      status: "Rescheduled",
    };
    setVisits((prev) => prev.map((v) => v.id === rescheduleVisitId ? updated : v));
    notifyParties("rescheduled", updated, rescheduleForm.reason);
    setRescheduleVisitId(null);
    toast.success("Visit rescheduled. Student and industry supervisor notified.");
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
        <button
          onClick={() => setShowNewForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <Plus className="w-4 h-4" /> Schedule New Visit
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-blue-800" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{upcoming.length}</p>
          <p className="text-blue-600 mt-1" style={{ fontSize: "0.8" }}>Upcoming</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800" style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{completed.length}</p>
          <p className="text-emerald-600 mt-1" style={{ fontSize: "0.8" }}>Completed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p style={{ fontSize: "1.8rem", lineHeight: 1.1 }}>{visits.length}</p>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8" }}>Total</p>
        </div>
      </div>

      {/* New Visit Form - Modal */}
      <ScheduleVisitModal
        isOpen={showNewForm}
        onClose={() => setShowNewForm(false)}
        assignedStudents={assignedStudents}
        onSchedule={handleScheduleVisit}
      />

      {/* Filter Tabs */}
      <div className="flex gap-1.5">
        {(["All", "Scheduled", "Completed", "Cancelled"] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
            }`}
            style={{ fontSize: "0.8rem" }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Reschedule Visit Modal */}
      <RescheduleVisitModal
        isOpen={!!rescheduleVisitId}
        onClose={() => setRescheduleVisitId(null)}
        visit={selectedRescheduleVisit}
        onReschedule={handleRescheduleVisit}
      />

      {/* Complete Visit Modal */}
      <CompleteVisitModal
        isOpen={!!showCompleteForm}
        onClose={() => setShowCompleteForm(null)}
        onComplete={(completeData) => showCompleteForm && handleCompleteVisit(showCompleteForm, completeData)}
      />

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
          {filtered
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((visit) => (
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