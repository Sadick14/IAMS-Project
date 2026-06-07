import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import {
  Search, AlertTriangle, MessageSquare, Download, X,
  Eye, BookMarked, MapPin, Clock, CheckCircle2, FileText, Award, Flag,
} from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";
import { exportToCSV } from "../../lib/csv-export";

interface Props {
  viewRole: ExtendedRole;
}

// Normalize backend internship to the flat shape the UI expects
function normalizeInternship(i: any) {
  return {
    id: String(i.id),
    studentName: i.student?.user?.name ?? "—",
    studentId:   i.student?.student_id ?? "—",
    studentUserId: String(i.student?.user?.id ?? ""),
    companyName: i.company?.name ?? "—",
    department:  i.student?.department?.name ?? i.student?.department ?? "—",
    level:       i.student?.level ?? "—",
    supervisorAssigned: i.academicSupervisor?.user?.name ?? i.academic_supervisor?.user?.name ?? "",
    status:      i.status ?? "active",
    startDate:   i.start_date ?? i.created_at ?? "—",
  };
}

const ROLE_PATH: Record<string, string> = {
  clo: "clo", dlo: "dlo", student: "student",
  academic_supervisor: "academic", industry_supervisor: "supervisor", hod: "hod",
};

export function StudentsPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [missed3, setMissed3] = useState<string[]>([]);
  const [missed7, setMissed7] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "scoring">("overview");

  // Detail modal data
  const [detailLogEntries, setDetailLogEntries] = useState<any[]>([]);
  const [detailAttendance, setDetailAttendance] = useState<any[]>([]);
  const [detailGrade, setDetailGrade] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Scoring panel state
  const [reportScore, setReportScore] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [presScore, setPresScore] = useState("");
  const [presComment, setPresComment] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);

  const canScore = viewRole === "dlo" || viewRole === "clo";

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    // No status filter — let backend scope by role (DLO=dept, CLO=all, student=own)
    const res = await apiClient.getInternships({ per_page: 200 });
    if (res.success) setEnrolledStudents(res.data.map(normalizeInternship));
    setLoading(false);
  }, []);

  const fetchMissed = useCallback(async () => {
    const [r3, r7] = await Promise.all([
      apiClient.getMissedAttendance(3),
      apiClient.getMissedAttendance(7),
    ]);
    if (r3.success) setMissed3(r3.data.map((i: any) => String(i.id)));
    if (r7.success) setMissed7(r7.data.map((i: any) => String(i.id)));
  }, []);

  useEffect(() => { fetchStudents(); fetchMissed(); }, [fetchStudents, fetchMissed]);

  // Load detail data when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setDetailLogEntries([]);
      setDetailAttendance([]);
      setDetailGrade(null);
      setReportScore(""); setReportComment(""); setPresScore(""); setPresComment("");
      return;
    }
    setDetailLoading(true);
    Promise.all([
      apiClient.getInternshipLogbooks(selectedStudent, { per_page: 5 }),
      apiClient.getInternshipAttendance(selectedStudent, {}),
      apiClient.getGrade(selectedStudent),
    ]).then(([logsRes, attRes, gradeRes]) => {
      if (logsRes.success) setDetailLogEntries(logsRes.data ?? []);
      if (attRes.success) setDetailAttendance(Array.isArray(attRes.data) ? attRes.data : attRes.data?.attendance ?? []);
      if (gradeRes.success && gradeRes.data) {
        const g = (gradeRes.data as any)?.grade ?? gradeRes.data;
        setDetailGrade(g);
        setReportScore(String(g?.report_score ?? ""));
        setReportComment(g?.report_comments ?? "");
        setPresScore(String(g?.presentation_score ?? ""));
        setPresComment(g?.presentation_comments ?? "");
      }
    }).finally(() => setDetailLoading(false));
  }, [selectedStudent]);

  // Compute activity status from last logbook entry
  const getActivityFromLogs = (internshipId: string) => {
    // For the main table we don't have individual logs — show status-based colour
    return null; // real status shown via StatusBadge
  };

  const departments = [...new Set(enrolledStudents.map((s) => s.department).filter(Boolean))].sort();

  const filtered = enrolledStudents.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.studentName.toLowerCase().includes(q) ||
      a.studentId.toLowerCase().includes(q) ||
      a.companyName.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || a.department === deptFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const detail = selectedStudent ? enrolledStudents.find((a) => a.id === selectedStudent) : null;

  // Compute last log date from detailLogEntries when a student is selected
  const lastLogDate = detailLogEntries.length > 0
    ? detailLogEntries.sort((a, b) => b.entry_date > a.entry_date ? 1 : -1)[0]?.entry_date
    : null;

  const handleSaveReport = async () => {
    if (!selectedStudent || !reportScore) return;
    setScoreSaving(true);
    const res = await apiClient.gradeReport(selectedStudent, {
      score: Number(reportScore),
      comments: reportComment || undefined,
    });
    setScoreSaving(false);
    if (res.success) {
      toast.success("Report score saved.");
      // Refresh grade
      const gr = await apiClient.getGrade(selectedStudent);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to save report score.");
    }
  };

  const handleSavePresentation = async () => {
    if (!selectedStudent || !presScore) return;
    setScoreSaving(true);
    const res = await apiClient.schedulePresentationScore({
      internship_id: Number(selectedStudent),
      score: Number(presScore),
      comments: presComment || undefined,
    });
    setScoreSaving(false);
    if (res.success) {
      toast.success("Presentation score saved.");
    } else {
      toast.error(res.message ?? "Failed to save presentation score.");
    }
  };

  const handleApproveGrade = async () => {
    if (!detailGrade?.id) { toast.error("No compiled grade to approve."); return; }
    const res = await apiClient.approveGrade(String(detailGrade.id));
    if (res.success) {
      toast.success("Grade approved.");
      const gr = await apiClient.getGrade(selectedStudent!);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to approve grade.");
    }
  };

  const handleCompileGrade = async () => {
    if (!selectedStudent) return;
    const res = await apiClient.compileGrade(selectedStudent);
    if (res.success) {
      toast.success("Grade compiled.");
      const gr = await apiClient.getGrade(selectedStudent);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to compile grade.");
    }
  };

  const commPath = `/${ROLE_PATH[viewRole] ?? viewRole}/communications`;

  return (
    <div className="space-y-6">
      {/* Missed check-in summary cards */}
      {(missed3.length > 0 || missed7.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">{missed3.length} student{missed3.length !== 1 ? "s" : ""}</p>
              <p className="text-amber-700" style={{ fontSize: "0.75rem" }}>Missed check-in 3+ days</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">{missed7.length} student{missed7.length !== 1 ? "s" : ""}</p>
              <p className="text-red-700" style={{ fontSize: "0.75rem" }}>Missed check-in 7+ days</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Students</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading ? "Loading…" : `${enrolledStudents.length} internship${enrolledStudents.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered.map((s) => ({
            Name: s.studentName, ID: s.studentId, Department: s.department,
            Company: s.companyName, Supervisor: s.supervisorAssigned, Status: s.status,
          })), "students_export")}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, ID, or company…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card" style={{ fontSize: "0.85rem" }} />
        </div>
        {viewRole === "clo" && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }}>
            <option value="All">All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        <div className="flex gap-1.5">
          {["All", "active", "completed", "pending"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
              style={{ fontSize: "0.8rem" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>Loading students…</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Company</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Supervisor</th>
                  {viewRole === "clo" && <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Department</th>}
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedStudent === s.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedStudent(s.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p style={{ fontSize: "0.85rem" }}>{s.studentName}</p>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">{s.studentId}</p>
                        </div>
                        {missed7.includes(s.id) && (
                          <span className="px-1.5 py-0.5 rounded text-white bg-red-500 flex items-center gap-1 shrink-0" style={{ fontSize: "0.65rem" }}>
                            <Flag className="w-2.5 h-2.5" /> 7d
                          </span>
                        )}
                        {!missed7.includes(s.id) && missed3.includes(s.id) && (
                          <span className="px-1.5 py-0.5 rounded text-amber-800 bg-amber-200 flex items-center gap-1 shrink-0" style={{ fontSize: "0.65rem" }}>
                            <Flag className="w-2.5 h-2.5" /> 3d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{s.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.85rem" }}>{s.supervisorAssigned || "—"}</td>
                    {viewRole === "clo" && <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>{s.department}</td>}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelectedStudent(s.id)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`${commPath}?tab=messages&recipient=${s.studentUserId}`)}
                        disabled={!s.studentUserId}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-40" title="Message">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={viewRole === "clo" ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    No students match your filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3>Student Details</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold" style={{ fontSize: "0.8rem" }}>
                  {detail.studentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p style={{ fontSize: "0.9rem" }} className="font-medium">{detail.studentName}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{detail.studentId} · Level {detail.level}</p>
                </div>
                <div className="ml-auto"><StatusBadge status={detail.status} /></div>
              </div>

              {/* Tabs — scoring only for CLO/DLO */}
              {canScore && (
                <div className="flex gap-1 border-b border-border -mt-2">
                  {(["overview", "scoring"] as const).map((k) => (
                    <button key={k} onClick={() => setDetailTab(k)}
                      className={`px-3 py-2 border-b-2 -mb-px capitalize ${detailTab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      style={{ fontSize: "0.8rem" }}>
                      {k}
                    </button>
                  ))}
                </div>
              )}

              {detailLoading && (
                <div className="text-center py-4 text-muted-foreground" style={{ fontSize: "0.85rem" }}>Loading…</div>
              )}

              {/* Overview Tab */}
              {(!canScore || detailTab === "overview") && !detailLoading && (
                <>
                  {[
                    ["Department", detail.department],
                    ["Company", detail.companyName],
                    ["Academic Supervisor", detail.supervisorAssigned || "Not assigned"],
                    ["Started", detail.startDate],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{l}</p>
                      <p style={{ fontSize: "0.85rem" }}>{v}</p>
                    </div>
                  ))}

                  {/* Recent Logbook */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <BookMarked className="w-3.5 h-3.5" />
                      RECENT LOGBOOK ENTRIES
                      {lastLogDate && <span className="ml-auto text-emerald-600">Last: {lastLogDate}</span>}
                    </p>
                    {detailLogEntries.length === 0 ? (
                      <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>No entries yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailLogEntries.slice(0, 3).map((e: any) => (
                          <div key={e.id} className="p-2.5 bg-secondary/30 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{e.entry_date}</span>
                              <StatusBadge status={e.status} />
                            </div>
                            <p style={{ fontSize: "0.8rem" }} className="line-clamp-2">{e.activities_description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Attendance */}
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <MapPin className="w-3.5 h-3.5" /> RECENT CHECK-INS
                    </p>
                    {detailAttendance.length === 0 ? (
                      <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>No check-ins recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailAttendance.slice(0, 3).map((a: any) => (
                          <div key={a.id} className="p-2.5 bg-secondary/30 rounded-lg flex items-center justify-between">
                            <div>
                              <p style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                {a.attendance_date}
                                <span className="text-muted-foreground ml-2" style={{ fontSize: "0.7rem" }}>
                                  <Clock className="w-3 h-3 inline" /> {a.check_in_time}
                                </span>
                              </p>
                              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{a.status}</p>
                            </div>
                            {(a.status === "present" || a.status === "late") ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : a.status === "absent" ? (
                              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Scoring Tab */}
              {canScore && detailTab === "scoring" && !detailLoading && (
                <div className="space-y-4">
                  {/* Grade summary */}
                  <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-1 mb-2" style={{ fontSize: "0.7rem" }}>
                      <Award className="w-3.5 h-3.5" /> GRADE COMPONENTS
                    </p>
                    {[
                      ["Industrial Assessment", detailGrade?.industrial_assessment_score],
                      ["Site Visitation", detailGrade?.site_visitation_score],
                      ["Report", detailGrade?.report_score],
                      ["Presentation", detailGrade?.presentation_score],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{label}</span>
                        <span className={`flex items-center gap-1.5 ${val ? "text-emerald-600" : "text-amber-600"}`} style={{ fontSize: "0.85rem" }}>
                          {val ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {val ?? "Pending"}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                      <span style={{ fontSize: "0.85rem" }}>Final</span>
                      <span style={{ fontSize: "0.95rem" }} className="font-semibold">
                        {detailGrade?.total_score ? `${detailGrade.total_score}%` : "—"}
                        {detailGrade?.status && <span className="ml-2"><StatusBadge status={detailGrade.status} /></span>}
                      </span>
                    </div>
                  </div>

                  {/* Report Score */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>REPORT SCORE</p>
                    <div className="flex gap-2">
                      <input type="number" min={0} max={100} value={reportScore} onChange={(e) => setReportScore(e.target.value)}
                        placeholder="0–100"
                        className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card" style={{ fontSize: "0.85rem" }} />
                      <button onClick={handleSaveReport} disabled={scoreSaving || !reportScore}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                        Save
                      </button>
                    </div>
                    <textarea value={reportComment} onChange={(e) => setReportComment(e.target.value)}
                      placeholder="Comments (optional)" rows={2}
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-card" style={{ fontSize: "0.8rem" }} />
                  </div>

                  {/* Presentation Score */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>PRESENTATION SCORE</p>
                    <div className="flex gap-2">
                      <input type="number" min={0} max={100} value={presScore} onChange={(e) => setPresScore(e.target.value)}
                        placeholder="0–100"
                        className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card" style={{ fontSize: "0.85rem" }} />
                      <button onClick={handleSavePresentation} disabled={scoreSaving || !presScore}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                        Save
                      </button>
                    </div>
                    <textarea value={presComment} onChange={(e) => setPresComment(e.target.value)}
                      placeholder="Comments (optional)" rows={2}
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-card" style={{ fontSize: "0.8rem" }} />
                  </div>

                  {/* Compile + Approve */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>FINALISE</p>
                    {!detailGrade?.id && (
                      <button onClick={handleCompileGrade}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:opacity-90 flex items-center justify-center gap-2" style={{ fontSize: "0.85rem" }}>
                        <FileText className="w-4 h-4" /> Compile Grade
                      </button>
                    )}
                    <button onClick={handleApproveGrade}
                      disabled={!detailGrade?.id || detailGrade?.status === "approved" || detailGrade?.status === "published"}
                      className="w-full py-2 bg-emerald-600 text-white rounded-md hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2" style={{ fontSize: "0.85rem" }}>
                      <CheckCircle2 className="w-4 h-4" /> Approve Final Grade
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
