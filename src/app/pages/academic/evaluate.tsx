import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { GradeBreakdownCard } from "../../components/grading/grade-breakdown-card";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import type { CompiledGrade, CompiledGradeStatus } from "../../types/grading";
import { ChevronLeft, Building2, ClipboardCheck, BookMarked, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SkeletonDashboard } from "../../components/skeleton";

import { StudentListReview } from "../../components/academic/student-list-review";
import { StudentLogbookView } from "../../components/academic/student-logbook-view";
import { StudentAttendanceView } from "../../components/academic/student-attendance-view";
import { StudentSiteVisitsView } from "../../components/academic/student-site-visits-view";

type Tab = "logbook" | "attendance" | "evaluation" | "visits";

interface NormalizedStudent {
  id: string;           // internship id — used as the selection key
  studentName: string;
  studentId: string;    // student number e.g. "STD-001"
  department: string;
  companyName: string;
  status: string;
}

// Convert a raw site visitation from the API to the SiteVisitNote shape
function normalizeVisitToNote(v: any) {
  return {
    id: String(v.id),
    date: v.visit_date ?? "—",
    observations: v.observations ?? v.visit_purpose ?? "",
    studentEngagement: v.student_engagement_rating ?? 3,
    companyFeedback: v.company_feedback ?? "",
    recommendations: v.recommendations ?? "",
  };
}

export function AcademicEvaluatePage() {
  const { user } = useAppContext();

  // ── Dashboard data ──
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ── Logbook data for all assigned students (keyed by internship id) ──
  const [logbookEntriesByStudent, setLogbookEntriesByStudent] = useState<Record<string, any[]>>({});
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // ── Per-student data loaded when a student is selected ──
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [siteVisitNotes, setSiteVisitNotes] = useState<any[]>([]);
  const [gradeData, setGradeData] = useState<any>(null);
  const [activeStructure, setActiveStructure] = useState<string | null>(null);

  // ── Navigation ──
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("logbook");

  // Load dashboard
  useEffect(() => {
    apiClient.getDashboard("academic-supervisor").then((res) => {
      if (res.success) setDashboard(res.data);
      setLoading(false);
    });
  }, []);

  // Derive assigned students from dashboard internships
  const assignedStudents: NormalizedStudent[] = (dashboard?.assigned_internships ?? []).map(
    (i: any): NormalizedStudent => ({
      id: String(i.id),
      studentName: i.student?.user?.name ?? "—",
      studentId: i.student?.student_id ?? "—",
      department: i.student?.department?.name ?? "—",
      companyName: i.company?.name ?? "—",
      status: i.status === "active" ? "Active" : "Pending",
    })
  );

  // Fetch logbook entries for all assigned students, keyed by internship id
  useEffect(() => {
    if (assignedStudents.length === 0) return;
    let cancelled = false;
    setIsLoadingRecords(true);
    Promise.all(
      assignedStudents.map(async (s) => {
        const res = await apiClient.getLogbookEntries({ internship_id: Number(s.id), per_page: 200 });
        return [s.id, res.success ? (res.data ?? []) : []] as const;
      })
    ).then((entries) => {
      if (!cancelled) {
        setLogbookEntriesByStudent(Object.fromEntries(entries));
        setIsLoadingRecords(false);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard]);

  // Load per-student data when selection changes
  const loadSelectedStudentData = useCallback(async (internshipId: string) => {
    const [attendanceRes, visitsRes] = await Promise.all([
      apiClient.getAttendance({ internship_id: Number(internshipId), per_page: 500 }),
      apiClient.getSiteVisitations({ internship_id: Number(internshipId), per_page: 100 }),
    ]);
    if (attendanceRes.success) setAttendanceRecords(attendanceRes.data ?? []);
    if (visitsRes.success) setSiteVisitNotes((visitsRes.data ?? []).map(normalizeVisitToNote));
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      setAttendanceRecords([]);
      setSiteVisitNotes([]);
      setGradeData(null);
      loadSelectedStudentData(selectedStudent);
      apiClient.getGrade(selectedStudent).then((res) => {
        setGradeData(res.success ? res.data?.grade ?? null : null);
      });
    }
  }, [selectedStudent, loadSelectedStudentData]);

  const student = assignedStudents.find((s) => s.id === selectedStudent);
  const logbookEntries = student ? (logbookEntriesByStudent[student.id] ?? []) : [];

  // Department's active grading structure — fall back to fetching it directly
  // when the final grade hasn't been compiled yet (gradeData is null).
  useEffect(() => {
    if (!student) { setActiveStructure(null); return; }
    if (gradeData?.grading_configuration?.structure) {
      setActiveStructure(gradeData.grading_configuration.structure);
      return;
    }
    let cancelled = false;
    apiClient.getActiveTerm().then((termRes) => {
      const termId = termRes.success ? termRes.data?.term?.id : undefined;
      apiClient.getGradingConfigs({ department: student.department, ...(termId ? { term_id: termId } : {}) }).then((res) => {
        if (cancelled) return;
        const active = res.success ? res.data.find((c: any) => c.status === "active") : undefined;
        setActiveStructure(active?.structure ?? null);
      });
    });
    return () => { cancelled = true; };
  }, [student?.department, gradeData]);

  // Logbook stats
  const approvedCount  = logbookEntries.filter((l: any) => l.status === "approved").length;
  const pendingCount   = logbookEntries.filter((l: any) => l.status === "draft" || l.status === "submitted").length;

  // Attendance view records
  const attendanceViewRecords = attendanceRecords.map((record: any) => {
    const hasGps = record.gps_check_in_lat != null && record.gps_check_in_lng != null;
    return {
      id: record.id,
      date: record.attendance_date ?? record.date,
      checkInTime: record.check_in_time ?? "—",
      checkInType: hasGps ? "gps" : "manual",
      location: hasGps
        ? `${record.gps_check_in_lat}, ${record.gps_check_in_lng}`
        : record.notes ?? "—",
      verificationStatus: record.verified_by ? "Verified" : "Pending Verification",
    };
  });

  const verifiedAttendance = attendanceRecords.filter((r: any) => r.verified_by).length;

  // Logbook view records
  const logbookViewRecords = logbookEntries.map((entry: any) => ({
    id: entry.id,
    date: entry.entry_date,
    activities: entry.activities_description,
    skills: entry.skills_learned ?? "",
    challenges: entry.challenges_faced ?? "",
    approvalStatus: mapLogbookStatus(entry.status),
    createdAt: entry.created_at,
  }));

  // Add site visit note via API, then reload
  const handleAddVisitNote = async (noteData: {
    date: string;
    observations: string;
    studentEngagement: number;
    companyFeedback: string;
    recommendations: string;
  }) => {
    if (!selectedStudent) return;
    const res = await apiClient.createSiteVisitation({
      internship_id: Number(selectedStudent),
      visit_date: noteData.date,
      visit_purpose: noteData.observations,
      observations: noteData.observations,
    });
    if (res.success) {
      toast.success("Site visit note recorded.");
      const visitsRes = await apiClient.getSiteVisitations({ internship_id: Number(selectedStudent), per_page: 100 });
      if (visitsRes.success) setSiteVisitNotes((visitsRes.data ?? []).map(normalizeVisitToNote));
    } else {
      toast.error("Failed to save site visit note.");
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "logbook", label: "Logbook", icon: BookMarked },
    { key: "attendance", label: "Attendance", icon: MapPin },
    { key: "visits", label: "Site Visits", icon: Building2 },
    { key: "evaluation", label: "Evaluation", icon: ClipboardCheck },
  ];

  if (loading) return <SkeletonDashboard statCount={3} />;

  // ── STUDENT LIST VIEW ──
  if (!selectedStudent) {
    return (
      <StudentListReview
        assignedStudents={assignedStudents}
        logbookEntriesByStudent={logbookEntriesByStudent}
        onReviewStudent={(internshipId) => {
          setSelectedStudent(internshipId);
          setActiveTab("logbook");
        }}
      />
    );
  }

  // ── STUDENT DETAIL VIEW ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => { setSelectedStudent(null); setActiveTab("logbook"); }}
          className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1.5 font-medium"
          style={{ fontSize: "0.8rem" }}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2>{student?.studentName}</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              (student?.status ?? "").toLowerCase() === "active"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            }`} style={{ fontSize: "0.7rem" }}>
              {student?.status}
            </span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            {student?.studentId} · {student?.department} · {student?.companyName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab("evaluation")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <ClipboardCheck className="w-4 h-4" /> Grade Breakdown
        </button>
      </div>

      {/* Student Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Log Entries</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{logbookEntries.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{approvedCount} approved</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Attendance</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{attendanceRecords.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>{verifiedAttendance} verified</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Site Visits</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{siteVisitNotes.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
            {siteVisitNotes.length > 0 ? "✓ Recorded" : "⏳ None yet"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Pending Logs</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className={`font-semibold ${pendingCount > 0 ? "text-amber-600" : ""}`}>
            {pendingCount}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>awaiting review</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:gap-2 sm:flex-1 ${
              activeTab === tab.key ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline" style={{ fontSize: "0.8rem" }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: LOGBOOK ── */}
      {activeTab === "logbook" && (
        <StudentLogbookView logbookEntries={logbookViewRecords} />
      )}

      {/* ── TAB: ATTENDANCE ── */}
      {activeTab === "attendance" && (
        <StudentAttendanceView attendanceRecords={attendanceViewRecords} />
      )}

      {/* ── TAB: SITE VISITS ── */}
      {activeTab === "visits" && (
        <StudentSiteVisitsView
          siteVisitNotes={siteVisitNotes}
          onAddVisitNote={handleAddVisitNote}
        />
      )}

      {/* ── TAB: EVALUATION ── */}
      {activeTab === "evaluation" && student && (() => {
        const cfg = gradeData?.grading_configuration;
        const backendStatus = gradeData?.status ?? "draft";
        const status: CompiledGradeStatus =
          backendStatus === "calculated" ? "Submitted" :
          (backendStatus === "approved" || backendStatus === "published") ? "Approved" : "Pending";

        const compiled: CompiledGrade | null = gradeData && cfg ? {
          applicationId: student.id,
          components: {
            industrial: cfg.industrial_assessment_max ? (gradeData.industrial_assessment_score / cfg.industrial_assessment_max) * 100 : undefined,
            departmental: cfg.site_visitation_max ? (gradeData.site_visitation_score / cfg.site_visitation_max) * 100 : undefined,
            report: cfg.report_max ? (gradeData.report_score / cfg.report_max) * 100 : undefined,
            presentation: cfg.presentation_max ? (gradeData.presentation_score / cfg.presentation_max) * 100 : undefined,
          },
          configSnapshot: {
            id: String(cfg.id ?? ""),
            departmentId: student.department,
            termId: String(cfg.academic_term_id ?? ""),
            structure: cfg.structure ?? DEFAULT_STRUCTURE,
            structureWeights: cfg.structure_weights ?? DEFAULT_STRUCTURE_WEIGHTS,
            sectionWeights: cfg.section_weights ?? DEFAULT_SECTION_WEIGHTS,
            status: "active",
            createdBy: "", createdAt: "", updatedBy: "", updatedAt: "",
          },
          finalPercent: gradeData.total_score ?? null,
          status,
          updatedAt: gradeData.calculated_at ?? gradeData.updated_at ?? "",
        } : null;

        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-300" style={{ fontSize: "0.85rem" }}>
                <strong>Your Role:</strong> As the Academic Supervisor, you grade three components:
              </p>
              <ul className="text-blue-800 dark:text-blue-300 mt-2 space-y-1" style={{ fontSize: "0.85rem" }}>
                <li>• <strong>Site Visitation</strong> (30%) — Use the <em>Site Visits</em> tab to record observations</li>
                <li>• <strong>Report</strong> (15%) — Evaluate the final attachment report</li>
                <li>• <strong>Presentation</strong> (15%) — Grade the student's presentation</li>
              </ul>
              <p className="text-blue-700 dark:text-blue-400 mt-3" style={{ fontSize: "0.85rem" }}>
                Once all your scores are submitted, the DLO will compile them with the Industrial Assessment (40% from company supervisor) and publish the final grade.
              </p>
              <p className="text-blue-700 dark:text-blue-400 mt-2" style={{ fontSize: "0.75rem" }}>
                {activeStructure
                  ? <>Department uses Structure {activeStructure}. The breakdown below shows all components once available.</>
                  : "Grading structure not yet configured for this department."}
              </p>
            </div>

            {compiled ? (
              <GradeBreakdownCard compiled={compiled} studentName={student.studentName} />
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                No grade components have been submitted yet.
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setActiveTab("visits")}
                className="px-4 py-2 border border-border bg-background text-foreground rounded-lg hover:bg-accent flex items-center gap-2 font-medium"
                style={{ fontSize: "0.85rem" }}
              >
                <Building2 className="w-4 h-4" /> Submit Site Visit Score
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function mapLogbookStatus(status: string | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "approved": return "Approved";
    case "revision_requested": return "Revision Requested";
    default: return "Pending";
  }
}
