import { useState, useEffect, useMemo, useCallback } from "react";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { departments } from "../../lib/mock-data";
import { checkInactiveStudents, flagInactiveStudent } from "../../services/logbook-service";
import { getMissedCheckIns } from "../../services/attendance-service";
import { apiClient } from "../../lib/api-client";
import {
  getCompiledGrade, getReportScore, getPresentationScore, getIndustrialAssessment, getSiteVisitation,
  submitReportScore, submitPresentationScore, approveCompiledGrade, requestGradeRevision,
} from "../../services/grading-service";
import type { GradingActor } from "../../types/grading";
import {
  Search, AlertTriangle, MessageSquare, Send, Download, X,
  Eye, BookMarked, MapPin, Clock, CheckCircle2, FileText, ClipboardList, Award,
} from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";
import { exportToCSV } from "../../lib/csv-export";

interface Props {
  viewRole: ExtendedRole;
}

type ActivityFilter = "All" | "Active" | "Warning" | "Flagged";

// Normalize backend internship to the flat shape the UI expects
function normalizeInternship(i: any) {
  return {
    id: String(i.id),
    studentName: i.student?.user?.name ?? i.student_name ?? "—",
    studentId:   i.student?.student_id ?? i.student_id ?? "—",
    companyName: i.company?.name ?? i.company_name ?? "—",
    department:  i.student?.department?.name ?? i.department ?? "—",
    level:       i.student?.level ?? i.level ?? "—",
    supervisorAssigned: i.academicSupervisor?.user?.name ?? i.supervisor_name ?? "",
    status:      i.status ?? "active",
    dateApplied: i.created_at ?? i.start_date ?? "—",
    gradeStatus: i.finalGrade?.status ?? null,
    grade:       i.finalGrade?.letter_grade ?? null,
    academic_supervisor_id: i.academic_supervisor_id ?? null,
  };
}

export function StudentsPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All");
  const [awaitingScores, setAwaitingScores] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "scoring">("overview");
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [detailLogEntries, setDetailLogEntries] = useState<any[]>([]);
  const [detailAttendanceRecords, setDetailAttendanceRecords] = useState<any[]>([]);
  const canScore = viewRole === "dlo" || viewRole === "clo";

  const department = (viewRole === "dlo" || viewRole === "hod" || viewRole === "academic") ? user?.department : undefined;
  const activityData = checkInactiveStudents();

  // Fetch internships from API
  const fetchStudents = useCallback(async () => {
    const res = await apiClient.getInternships({ status: "active,completed,pending" });
    if (res.success) setEnrolledStudents(res.data.map(normalizeInternship));
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const allMissedCheckins = getMissedCheckIns(department);

  const filtered = enrolledStudents.filter((a: any) => {
    const matchSearch = (a.studentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.studentId ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.companyName ?? "").toLowerCase().includes(search.toLowerCase());
    
    const matchTerm = termFilter === "All" || termFilter === "Active Term";
    const matchDept = department ? (a.department ?? "").includes(department) : (deptFilter === "All" || a.department === deptFilter);
    const act = getActivity(a.studentName);
    const matchActivity = activityFilter === "All" ||
      (activityFilter === "Active" && act?.status === "green") ||
      (activityFilter === "Warning" && act?.status === "yellow") ||
      (activityFilter === "Flagged" && act?.status === "red");
    let matchAwaiting = true;
    if (awaitingScores) {
      const scoreEligible = ["active", "completed", "Active", "Completed"].includes(a.status ?? "");
      matchAwaiting = scoreEligible && !a.gradeStatus;
    }
    return matchSearch && matchTerm && matchDept && matchActivity && matchAwaiting;
  });

  function getActivity(name: string) {
    return activityData.find((s) => s.studentName === name);
  }
  
  function getStudentMissedDays(id: string) {
    return allMissedCheckins.find(m => m.studentId === id)?.missedDays || 0;
  }

  const greenCount = activityData.filter((s) => s.status === "green").length;
  const yellowCount = activityData.filter((s) => s.status === "yellow").length;
  const redCount = activityData.filter((s) => s.status === "red").length;

  const handleSendReminders = () => {
    const inactive = activityData.filter((s) => s.status === "red" || s.status === "yellow");
    inactive.forEach((s) => {
      flagInactiveStudent(s.studentName, "Unknown", s.daysSinceLog);
    });
    toast.success(`Reminders sent to ${inactive.length} inactive students.`);
  };

  const detail = selectedStudent ? enrolledStudents.find((a: any) => a.id === selectedStudent) : null;
  const detailActivity = detail ? getActivity(detail.studentName) : null;

  // Fetch logbook entries and attendance when a student is selected
  useEffect(() => {
    if (!selectedStudent) { setDetailLogEntries([]); setDetailAttendanceRecords([]); return; }
    const internshipId = selectedStudent;
    apiClient.getInternshipLogbooks(internshipId).then((r) => { if (r.success) setDetailLogEntries(r.data); });
    apiClient.getInternshipAttendance(internshipId).then((r) => {
      if (r.success) setDetailAttendanceRecords(Array.isArray(r.data) ? r.data : r.data?.attendance ?? []);
    });
  }, [selectedStudent]);

  const detailAttendance = detailAttendanceRecords;
  const missedDays = detail ? getStudentMissedDays(detail.studentId) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Students</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Monitor student progress, attendance, and activity · {enrolledStudents.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const data = activityData.map(s => ({ Name: s.studentName, ID: s.studentId, Department: s.department, "Days Since Log": s.daysSinceLog, "Last Log": s.lastLogDate, Status: s.status }));
              exportToCSV(data, "students_activity_export");
            }}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={handleSendReminders}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <Send className="w-4 h-4" /> Send Reminders
          </button>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active (logging regularly)", value: greenCount, color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500", filter: "Active" as ActivityFilter },
          { label: "Warning (3+ days inactive)", value: yellowCount, color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500", filter: "Warning" as ActivityFilter },
          { label: "Flagged (7+ days inactive)", value: redCount, color: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500", filter: "Flagged" as ActivityFilter },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setActivityFilter(activityFilter === item.filter ? "All" : item.filter)}
            className={`${item.color} border rounded-xl p-4 flex items-center gap-3 transition-all ${activityFilter === item.filter ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full ${item.dot}`} />
            <div className="text-left">
              <p style={{ fontSize: "1.3rem" }}>{item.value}</p>
              <p style={{ fontSize: "0.8rem" }}>{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, ID, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <select
          value={termFilter}
          onChange={(e) => setTermFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-card"
          style={{ fontSize: "0.85rem" }}
        >
          <option value="All">All Terms</option>
          <option value="Active Term">Current Term</option>
          <option value="Past Term">Previous Term</option>
        </select>
        {viewRole === "clo" && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-card"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        {canScore && (
          <button
            onClick={() => setAwaitingScores((v) => !v)}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 ${awaitingScores ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}
            style={{ fontSize: "0.8rem" }}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Awaiting scores
          </button>
        )}
        {(activityFilter !== "All" || awaitingScores) && (
          <button
            onClick={() => { setActivityFilter("All"); setAwaitingScores(false); }}
            className="px-3 py-2 text-primary hover:underline flex items-center gap-1"
            style={{ fontSize: "0.8rem" }}
          >
            Clear filter <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table & Detail */}
      <div className="space-y-4">
        {/* ── Mobile card list (hidden on desktop) ── */}
        <div className="lg:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border" style={{ fontSize: "0.85rem" }}>No students match your filters.</div>
          ) : (
            filtered.map((app) => {
              const act = getActivity(app.studentName);
              const status = act?.status || "green";
              const missed = getStudentMissedDays(app.studentId);
              return (
                <div
                  key={app.id}
                  className={`bg-card border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/30 transition-colors ${selectedStudent === app.id ? "border-primary" : "border-border"}`}
                  onClick={() => setSelectedStudent(app.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${status === "green" ? "bg-emerald-500" : status === "yellow" ? "bg-amber-500" : "bg-red-500"}`} />
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{app.studentName}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{app.studentId}</p>
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="space-y-1 text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                    <p className="truncate">🏢 {app.companyName}</p>
                    {app.supervisorAssigned && <p className="truncate">👤 {app.supervisorAssigned}</p>}
                    {viewRole === "clo" && <p>{app.department.split(" ")[0]}</p>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex gap-3 text-muted-foreground" style={{ fontSize: "0.78rem" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {act ? `${act.daysSinceLog}d ago` : "N/A"}
                        {status === "red" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </span>
                      {missed > 0 && (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" /> {missed} missed
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toast.success(`Message sent to ${app.studentName}.`)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Activity</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Company</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Supervisor</th>
                  {viewRole === "clo" && <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Department</th>}
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Last Log</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Missed Check-ins</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const act = getActivity(app.studentName);
                  const status = act?.status || "green";
                  const missedDays = getStudentMissedDays(app.studentId);
                  
                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedStudent === app.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedStudent(app.id)}
                    >
                      <td className="px-4 py-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            status === "green" ? "bg-emerald-500" : status === "yellow" ? "bg-amber-500" : "bg-red-500"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p style={{ fontSize: "0.85rem" }}>{app.studentName}</p>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">{app.studentId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{app.companyName}</td>
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{app.supervisorAssigned || "-"}</td>
                      {viewRole === "clo" && <td className="px-4 py-3" style={{ fontSize: "0.8rem" }}>{app.department.split(" ")[0]}</td>}
                      <td className="px-4 py-3">
                        <span style={{ fontSize: "0.8rem" }} className="text-muted-foreground">
                          {act ? `${act.daysSinceLog}d ago` : "N/A"}
                        </span>
                        {status === "red" && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                           <span style={{ fontSize: "0.85rem" }} className={missedDays > 0 ? "font-semibold text-red-600" : "text-muted-foreground"}>
                              {missedDays}
                           </span>
                           {missedDays >= 3 && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedStudent(app.id)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toast.success(`Message sent to ${app.studentName}.`)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                            title="Send message"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={viewRole === "clo" ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                      No students match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {detail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3>Student Details</h3>
                  <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-md hover:bg-accent">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground" style={{ fontSize: "0.8rem" }}>
                    {detail.studentName.split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.9rem" }}>{detail.studentName}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{detail.studentId}</p>
                  </div>
                  {detailActivity && (
                    <div className={`ml-auto w-3 h-3 rounded-full ${
                      detailActivity.status === "green" ? "bg-emerald-500" : detailActivity.status === "yellow" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                  )}
                </div>

                {canScore && (
                  <div className="flex gap-1 border-b border-border -mt-2">
                    {([
                      ["overview", "Overview"],
                      ["scoring", "Scoring"],
                    ] as const).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setDetailTab(k)}
                        className={`px-3 py-2 border-b-2 -mb-px ${detailTab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        style={{ fontSize: "0.8rem" }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {(!canScore || detailTab === "overview") && <>{[
                  ["Department", detail.department],
                  ["Level", detail.level],
                  ["Company", detail.companyName],
                  ["Supervisor", detail.supervisorAssigned || "Not assigned"],
                  ["Applied", detail.dateApplied],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{l}</p>
                    <p style={{ fontSize: "0.85rem" }}>{v}</p>
                  </div>
                ))}

                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Status</p>
                  <StatusBadge status={detail.status} />
                </div>

                {detailActivity && (
                  <div className={`rounded-lg p-3 ${
                    detailActivity.status === "green" ? "bg-emerald-50" : detailActivity.status === "yellow" ? "bg-amber-50" : "bg-red-50"
                  }`}>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Last Logbook Entry</p>
                    <p style={{ fontSize: "0.85rem" }} className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {detailActivity.daysSinceLog} day{detailActivity.daysSinceLog !== 1 ? "s" : ""} ago
                    </p>
                    {detailActivity.status === "red" && (
                      <p className="text-red-600 mt-1 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                        <AlertTriangle className="w-3 h-3" /> Auto-flagged for inactivity
                      </p>
                    )}
                  </div>
                )}

                {/* Recent Logbook Entries */}
                {detailLogEntries.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <BookMarked className="w-3.5 h-3.5" /> RECENT LOGBOOK ENTRIES
                    </p>
                    <div className="space-y-2">
                      {detailLogEntries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="p-2.5 bg-secondary/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{entry.entry_date ?? entry.date}</span>
                            <StatusBadge status={entry.status ?? entry.approvalStatus} />
                          </div>
                          <p style={{ fontSize: "0.8rem" }} className="line-clamp-2">{entry.activities_description ?? entry.activities}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendance Record */}
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <MapPin className="w-3.5 h-3.5" /> RECENT CHECK-INS
                    </p>
                    {missedDays > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                        {missedDays} missed day{missedDays > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  
                  {detailAttendance.length === 0 ? (
                    <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>No check-ins recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailAttendance.slice(0, 3).map((att) => (
                        <div key={att.id} className="p-2.5 bg-secondary/30 rounded-lg flex items-center justify-between">
                          <div>
                            <p style={{ fontSize: "0.8rem", fontWeight: 500 }} className="flex items-center gap-1.5">
                              {att.attendance_date ?? att.date}
                              <span className="text-muted-foreground" style={{ fontSize: "0.7rem", fontWeight: 400 }}>
                                <Clock className="w-3 h-3 inline" /> {att.check_in_time ?? att.checkInTime}
                              </span>
                            </p>
                            <p className="text-muted-foreground truncate max-w-[180px]" style={{ fontSize: "0.75rem" }}>
                              <FileText className="w-2.5 h-2.5 inline mr-1" />
                              {att.notes ?? att.location ?? att.status}
                            </p>
                          </div>
                          <div className="shrink-0">
                             {att.status === "present" || att.status === "late" ? (
                               <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                             ) : att.status === "absent" ? (
                               <AlertTriangle className="w-4 h-4 text-red-500" />
                             ) : (
                               <Clock className="w-4 h-4 text-amber-500" />
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                </>}

                {canScore && detailTab === "scoring" && (
                  <ScoringPanel
                    applicationId={detail.id}
                    viewRole={viewRole}
                    actorName={user?.name || "Unknown"}
                    actorId={user?.id || "unknown"}
                  />
                )}

                <div className="pt-3 border-t border-border space-y-2">
                  <button
                    onClick={() => toast.success(`Message sent to ${detail.studentName}.`)}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ fontSize: "0.85rem" }}
                  >
                    <MessageSquare className="w-4 h-4" /> Send Message
                  </button>
                  {detailActivity && (detailActivity.status === "yellow" || detailActivity.status === "red") && (
                    <button
                      onClick={() => {
                        flagInactiveStudent(detail.studentName, detail.studentId, detailActivity.daysSinceLog);
                        toast.success("Reminder sent and student flagged.");
                      }}
                      className="w-full py-2 border border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 flex items-center justify-center gap-2"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <AlertTriangle className="w-4 h-4" /> Flag & Send Reminder
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ScoringPanelProps {
  applicationId: string;
  viewRole: ExtendedRole;
  actorName: string;
  actorId: string;
}

function ScoringPanel({ applicationId, viewRole, actorName, actorId }: ScoringPanelProps) {
  const { store } = useAppContext();
  const compiled = useMemo(() => getCompiledGrade(applicationId), [applicationId, store.compiledGrades]);
  const industrial = useMemo(() => getIndustrialAssessment(applicationId), [applicationId, store.industrialAssessments]);
  const visit = useMemo(() => getSiteVisitation(applicationId), [applicationId, store.siteVisitations]);
  const report = useMemo(() => getReportScore(applicationId), [applicationId, store.reportScores]);
  const presentation = useMemo(() => getPresentationScore(applicationId), [applicationId, store.presentationScores]);

  const [reportInput, setReportInput] = useState<string>(report ? String(report.score) : "");
  const [reportComment, setReportComment] = useState<string>(report?.comments || "");
  const [presInput, setPresInput] = useState<string>(presentation ? String(presentation.score) : "");
  const [presComment, setPresComment] = useState<string>(presentation?.comments || "");
  const [revisionReason, setRevisionReason] = useState("");

  useEffect(() => {
    setReportInput(report ? String(report.score) : "");
    setReportComment(report?.comments || "");
    setPresInput(presentation ? String(presentation.score) : "");
    setPresComment(presentation?.comments || "");
  }, [applicationId, visit]);

  const actor: GradingActor = {
    id: actorId,
    name: actorName,
    role: (viewRole === "clo" ? "clo" : "dlo") as GradingActor["role"],
  };

  const submitReport = () => {
    const n = Number(reportInput);
    const r = submitReportScore(applicationId, n, reportComment, actor);
    r.success ? toast.success(r.message) : toast.error(r.message);
  };
  const submitPres = () => {
    const n = Number(presInput);
    const r = submitPresentationScore(applicationId, n, presComment, actor);
    r.success ? toast.success(r.message) : toast.error(r.message);
  };
  const approveFinal = () => {
    const r = approveCompiledGrade(applicationId, actor);
    r.success ? toast.success(r.message) : toast.error(r.message);
  };
  const requestRevision = () => {
    if (!revisionReason.trim()) { toast.error("Please provide a reason."); return; }
    const r = requestGradeRevision(applicationId, revisionReason, actor);
    if (r.success) { toast.success(r.message); setRevisionReason(""); }
    else toast.error(r.message);
  };

  const Row = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{label}</span>
      <span className="flex items-center gap-1.5" style={{ fontSize: "0.85rem" }}>
        {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 bg-muted/20">
        <p className="text-muted-foreground mb-1 flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
          <Award className="w-3.5 h-3.5" /> COMPONENTS
        </p>
        <Row label="Industrial Supervisor" value={industrial ? "Submitted" : "Pending"} ok={!!industrial} />
        <Row label="Departmental (Site Visit)" value={visit ? `${visit.score}/100` : "Pending"} ok={!!visit} />
        <Row label="Report" value={report ? `${report.score}/100` : "Pending"} ok={!!report} />
        <Row label="Presentation" value={presentation ? `${presentation.score}/100` : "Pending"} ok={!!presentation} />
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
          <span style={{ fontSize: "0.85rem" }}>Final</span>
          <span style={{ fontSize: "0.95rem" }}>
            {compiled?.finalPercent !== null && compiled?.finalPercent !== undefined ? `${compiled.finalPercent}%` : "—"}
            {compiled?.status && (
              <span className="ml-2"><StatusBadge status={compiled.status} /></span>
            )}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>REPORT SCORE</p>
        <div className="flex gap-2">
          <input
            type="number" min={0} max={100}
            value={reportInput}
            onChange={(e) => setReportInput(e.target.value)}
            placeholder="0–100"
            className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
          <button onClick={submitReport} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90" style={{ fontSize: "0.8rem" }}>
            Save
          </button>
        </div>
        <textarea
          value={reportComment}
          onChange={(e) => setReportComment(e.target.value)}
          placeholder="Comments (optional)"
          rows={2}
          className="w-full px-3 py-1.5 rounded-md border border-border bg-card"
          style={{ fontSize: "0.8rem" }}
        />
      </div>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>PRESENTATION SCORE</p>
        <div className="flex gap-2">
          <input
            type="number" min={0} max={100}
            value={presInput}
            onChange={(e) => setPresInput(e.target.value)}
            placeholder="0–100"
            className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
          <button onClick={submitPres} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90" style={{ fontSize: "0.8rem" }}>
            Save
          </button>
        </div>
        <textarea
          value={presComment}
          onChange={(e) => setPresComment(e.target.value)}
          placeholder="Comments (optional)"
          rows={2}
          className="w-full px-3 py-1.5 rounded-md border border-border bg-card"
          style={{ fontSize: "0.8rem" }}
        />
      </div>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>FINALISE</p>
        <button
          onClick={approveFinal}
          disabled={!compiled || compiled.finalPercent === null || compiled.status === "Approved"}
          className="w-full py-2 bg-emerald-600 text-white rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <CheckCircle2 className="w-4 h-4" /> Approve Final Grade
        </button>
        <input
          value={revisionReason}
          onChange={(e) => setRevisionReason(e.target.value)}
          placeholder="Revision reason"
          className="w-full px-3 py-1.5 rounded-md border border-border bg-card"
          style={{ fontSize: "0.8rem" }}
        />
        <button
          onClick={requestRevision}
          disabled={!compiled}
          className="w-full py-1.5 border border-amber-500 text-amber-700 rounded-md hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontSize: "0.8rem" }}
        >
          Request Revision
        </button>
      </div>
    </div>
  );
}