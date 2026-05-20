import { useState } from "react";
import { useAppContext } from "../../lib/context";
import { getStudentLogbook } from "../../services/logbook-service";
import { getAttendanceRecords } from "../../services/attendance-service";
import { getCompiledGrade, getActiveConfig } from "../../services/grading-service";
import { updateApplication, addNotification, addAuditLog } from "../../lib/store";
import { GradeBreakdownCard } from "../../components/grading/grade-breakdown-card";
import { ChevronLeft, Building2, ClipboardCheck, BookMarked, MapPin } from "lucide-react";
import { toast } from "sonner";

import { StudentListReview } from "../../components/academic/student-list-review";
import { StudentLogbookView } from "../../components/academic/student-logbook-view";
import { StudentAttendanceView } from "../../components/academic/student-attendance-view";
import { StudentSiteVisitsView } from "../../components/academic/student-site-visits-view";

type Tab = "logbook" | "attendance" | "evaluation" | "visits";

interface SiteVisitNote {
  id: string;
  date: string;
  observations: string;
  studentEngagement: number; // 1-5
  companyFeedback: string;
  recommendations: string;
}

interface EvaluationForm {
  technicalSkills: number;
  problemSolving: number;
  communication: number;
  professionalism: number;
  logbookQuality: number;
  reportQuality: number;
  supervisorRelationship: number;
  overallPerformance: number;
  strengths: string;
  improvements: string;
  generalComments: string;
  recommendation: string;
}

const defaultEvaluation: EvaluationForm = {
  technicalSkills: 0,
  problemSolving: 0,
  communication: 0,
  professionalism: 0,
  logbookQuality: 0,
  reportQuality: 0,
  supervisorRelationship: 0,
  overallPerformance: 0,
  strengths: "",
  improvements: "",
  generalComments: "",
  recommendation: "",
};

const criteria = [
  { key: "technicalSkills" as const, label: "Technical Skills Acquired", maxScore: 15, description: "Relevance and depth of skills gained during attachment" },
  { key: "problemSolving" as const, label: "Problem Solving & Initiative", maxScore: 15, description: "Ability to identify and solve problems independently" },
  { key: "communication" as const, label: "Communication Skills", maxScore: 10, description: "Written and verbal communication effectiveness" },
  { key: "professionalism" as const, label: "Professionalism & Conduct", maxScore: 10, description: "Punctuality, attitude, and professional behavior" },
  { key: "logbookQuality" as const, label: "Logbook Quality", maxScore: 15, description: "Completeness, accuracy, and consistency of daily logs" },
  { key: "reportQuality" as const, label: "Final Report Quality", maxScore: 25, description: "Structure, content depth, and analysis quality" },
  { key: "supervisorRelationship" as const, label: "Supervisor Relationship", maxScore: 5, description: "Relationship with industry and academic supervisors" },
  { key: "overallPerformance" as const, label: "Overall Performance", maxScore: 5, description: "Holistic assessment of the student's attachment experience" },
];

export function AcademicEvaluatePage() {
  const { user, store } = useAppContext();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("logbook");
  const [evaluation, setEvaluation] = useState<EvaluationForm>({ ...defaultEvaluation });
  const [siteVisitNotes, setSiteVisitNotes] = useState<SiteVisitNote[]>([
    {
      id: "sv1",
      date: "2026-04-10",
      observations: "Student is well-integrated into the team. Workstation is set up properly. Company mentor is actively engaged.",
      studentEngagement: 4,
      companyFeedback: "Very satisfied with student performance. Contributes actively to projects.",
      recommendations: "Continue current trajectory. Consider involving student in the upcoming network migration project.",
    },
  ]);

  // Get assigned students
  const assignedStudents = store.applications.filter(
    (a) => (a.status === "Active" || a.status === "Completed") &&
      (a.supervisorAssigned === user?.name || a.department === user?.department)
  );

  const student = assignedStudents.find((s) => s.id === selectedStudent);
  const logbookEntries = student ? getStudentLogbook(student.studentId) : [];
  const attendanceRecords = student ? getAttendanceRecords({ studentId: student.studentId }) : [];

  // Logbook stats
  const approvedCount = logbookEntries.filter((l) => l.approvalStatus === "Approved").length;
  const pendingCount = logbookEntries.filter((l) => l.approvalStatus === "Pending").length;
  const revisionCount = logbookEntries.filter((l) => l.approvalStatus === "Revision Requested").length;

  // Attendance stats
  const verifiedAttendance = attendanceRecords.filter((r) => r.verificationStatus === "Verified").length;

  // Evaluation total
  const totalScore = criteria.reduce((sum, c) => sum + (evaluation[c.key] || 0), 0);
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const getGradeLetter = (score: number) => {
    const pct = (score / maxTotal) * 100;
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C+";
    if (pct >= 45) return "C";
    if (pct >= 40) return "D";
    return "F";
  };

  const handleSubmitEvaluation = () => {
    if (!student) return;
    const grade = getGradeLetter(totalScore);

    updateApplication(student.id, {
      grade,
      gradeStatus: "Submitted",
    });

    addAuditLog({
      id: `al-${Date.now()}`,
      user: user?.name || "",
      action: "Submitted Grade",
      target: `${student.studentName} (${student.studentId})`,
      timestamp: new Date().toISOString(),
      details: `Grade ${grade} (${totalScore}/${maxTotal}) submitted. Pending DLO approval.`,
    });

    addNotification({
      id: `n-${Date.now()}`,
      type: "grade",
      title: "Grade Submitted",
      message: `${user?.name} submitted grade ${grade} for ${student.studentName} (${student.studentId}). Pending DLO approval.`,
      read: false,
      timestamp: new Date().toISOString(),
    });

    toast.success(`Grade ${grade} (${totalScore}/${maxTotal}) submitted for ${student.studentName}. DLO will be notified.`);
    setSelectedStudent(null);
    setEvaluation({ ...defaultEvaluation });
    setActiveTab("logbook");
  };

  const handleAddVisitNote = (noteData: {
    date: string;
    observations: string;
    studentEngagement: number;
    companyFeedback: string;
    recommendations: string;
  }) => {
    const note: SiteVisitNote = {
      id: `sv-${Date.now()}`,
      ...noteData,
    };
    setSiteVisitNotes((prev) => [note, ...prev]);
    toast.success("Site visit note recorded.");
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "logbook", label: "Logbook", icon: BookMarked },
    { key: "attendance", label: "Attendance", icon: MapPin },
    { key: "visits", label: "Site Visits", icon: Building2 },
    { key: "evaluation", label: "Evaluation", icon: ClipboardCheck },
  ];

  // ── STUDENT LIST VIEW ──
  if (!selectedStudent) {
    return (
      <StudentListReview
        assignedStudents={assignedStudents}
        onReviewStudent={(studentId) => {
          setSelectedStudent(studentId);
          setActiveTab("logbook");
          setEvaluation({ ...defaultEvaluation });
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
              student?.status === "Active"
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
        {student?.status === "Active" && !student?.grade && (
          <button
            type="button"
            onClick={() => setActiveTab("evaluation")}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            <ClipboardCheck className="w-4 h-4" /> Submit Evaluation
          </button>
        )}
      </div>

      {/* Student Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Log Entries</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{logbookEntries.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
            {approvedCount} approved · {pendingCount} pending
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Attendance</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{attendanceRecords.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
            {verifiedAttendance} verified
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Site Visits</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{siteVisitNotes.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>Recorded</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 text-center">
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Grade</p>
          <p style={{ fontSize: "1.5rem", lineHeight: 1.2 }} className="font-semibold">{student?.grade || "—"}</p>
          <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
            {student?.gradeStatus || "Not graded"}
          </p>
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
        <StudentLogbookView logbookEntries={logbookEntries} />
      )}

      {/* ── TAB: ATTENDANCE ── */}
      {activeTab === "attendance" && (
        <StudentAttendanceView attendanceRecords={attendanceRecords} />
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
        const config = getActiveConfig(student.department);
        const compiled = getCompiledGrade(student.id);

        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 dark:bg-blue-950/20 dark:border-blue-800">
              <p className="text-blue-800 dark:text-blue-300" style={{ fontSize: "0.85rem" }}>
                As the Academic Supervisor, your only graded contribution is the <strong>Site Visitation Score (30%)</strong>.
                The Attachment Report and Final Presentation scores are entered by the DLO. The breakdown below is read-only —
                use the <em>Site Visit</em> tab to submit or update your rubric.
              </p>
              <p className="text-blue-700 dark:text-blue-400 mt-2" style={{ fontSize: "0.75rem" }}>
                Department uses Structure {config.structure}.
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