import { toast } from "sonner";
import { SkeletonList } from "../../components/skeleton";
import type { ExtendedRole } from "../../services/auth-service";
import { exportToCSV } from "../../lib/csv-export";
import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { departments } from "../../lib/mock-data";
import { hasActiveConfig } from "../../services/grading-service";
import { AlertTriangle } from "lucide-react";
import { CheckCircle2, RotateCcw, Search, Download, FileText, Clock, BarChart3, Eye, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiClient } from "../../lib/api-client";

interface Props {
  viewRole: ExtendedRole;
}

type GradeTab = "all" | "submitted" | "approved" | "pending";

// Map backend grade to normalized display shape
function normalizeGrade(g: any) {
  const studentName = g.internship?.student?.user?.name ?? g.student_name ?? "—";
  const studentId   = g.internship?.student?.student_id ?? g.student_id ?? "—";
  const companyName = g.internship?.company?.name ?? g.company_name ?? "—";
  const dept        = g.internship?.student?.department?.name ?? g.department ?? "—";
  const supervisor  = g.internship?.academicSupervisor?.user?.name ?? g.supervisor_name ?? "";
  // Backend statuses: draft | calculated | approved | published
  const backendStatus = g.status ?? "draft";
  const gradeStatus =
    backendStatus === "calculated" ? "Submitted" :
    backendStatus === "approved"   ? "Approved"  :
    backendStatus === "published"  ? "Published" : "Pending";
  return {
    id: String(g.id),
    internshipId: String(g.internship_id ?? g.internship?.id ?? g.id),
    studentName, studentId, companyName, department: dept, supervisorAssigned: supervisor,
    gradeStatus, backendStatus,
    finalPercent: g.total_score ?? null,
    letterGrade: g.letter_grade ?? null,
    gpa: g.gpa ?? null,
  };
}

export function GradesPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const [rawGrades, setRawGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<GradeTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const department = viewRole === "dlo" ? user?.department : undefined;

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getGrades();
    if (res.success) setRawGrades(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  const gradeApps = rawGrades
    .map(normalizeGrade)
    .filter((g) => department ? g.department === department : (deptFilter === "All" || g.department === deptFilter));

  const filtered = gradeApps.filter((g) => {
    const matchSearch = search === "" ||
      g.studentName.toLowerCase().includes(search.toLowerCase()) ||
      g.studentId.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "all" ||
      (activeTab === "submitted" && g.gradeStatus === "Submitted") ||
      (activeTab === "approved"  && (g.gradeStatus === "Approved" || g.gradeStatus === "Published")) ||
      (activeTab === "pending"   && g.gradeStatus === "Pending");
    return matchSearch && matchTab;
  });

  const submittedCount = gradeApps.filter((g) => g.gradeStatus === "Submitted").length;
  const approvedCount  = gradeApps.filter((g) => g.gradeStatus === "Approved" || g.gradeStatus === "Published").length;
  const pendingCount   = gradeApps.filter((g) => g.gradeStatus === "Pending").length;

  const buckets = [
    { label: "0–49", min: 0, max: 50 }, { label: "50–59", min: 50, max: 60 },
    { label: "60–69", min: 60, max: 70 }, { label: "70–79", min: 70, max: 80 },
    { label: "80–89", min: 80, max: 90 }, { label: "90–100", min: 90, max: 101 },
  ];
  const scoreDistribution = buckets
    .map((b) => ({
      bucket: b.label,
      count: gradeApps.filter((g) => g.finalPercent !== null && g.finalPercent >= b.min && g.finalPercent < b.max).length,
    }))
    .filter((b) => b.count > 0);

  const finalised = gradeApps.filter((g) => g.finalPercent !== null);
  const avgPercent = finalised.length > 0
    ? (finalised.reduce((s, g) => s + (g.finalPercent || 0), 0) / finalised.length).toFixed(1)
    : "N/A";

  const handleApprove = async (gradeId: string) => {
    const res = await apiClient.approveGrade(gradeId);
    if (res.success) { toast.success(res.message ?? "Grade approved."); fetchGrades(); }
    else toast.error(res.message ?? "Failed to approve grade.");
  };

  const handlePublish = async (gradeId: string) => {
    const res = await apiClient.publishGrade(gradeId);
    if (res.success) { toast.success(res.message ?? "Grade published."); fetchGrades(); }
    else toast.error(res.message ?? "Failed to publish grade.");
  };

  const handleRevision = async (gradeId: string) => {
    const res = await apiClient.requestGradeRevision(gradeId, "Grade needs review");
    if (res.success) { toast.info(res.message ?? "Revision requested."); fetchGrades(); }
    else toast.error(res.message ?? "Failed to request revision.");
  };

  const detail = selectedId ? gradeApps.find((g) => g.id === selectedId) : null;
  // detailGrade is the same as detail for the breakdown card (fields align)
  const detailGrade = detail ? { finalPercent: detail.finalPercent, status: detail.gradeStatus } : null;

  const tabCounts = { all: gradeApps.length, submitted: submittedCount, approved: approvedCount, pending: pendingCount };

  if (loading) return <SkeletonList count={5} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Grade Management</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Review and approve final attachment grades · {gradeApps.length} records
          </p>
        </div>
        <button
          onClick={() => {
            exportToCSV(
              gradeApps.map(g => ({
                Student: g.studentName,
                ID: g.studentId,
                Company: g.companyName,
                Department: g.department,
                "Final %": g.finalPercent ?? "Pending",
                "Letter Grade": g.letterGrade ?? "—",
                Status: g.gradeStatus,
              })),
              "grades_export"
            );
          }}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" /> Export Grades
        </button>
      </div>

      {loading && <SkeletonList rows={5} />}
      {viewRole === "dlo" && department && !hasActiveConfig(department) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800" style={{ fontSize: "0.85rem" }}>
            No approved grading configuration exists for {department}. Final grades cannot be compiled
            until the structure is configured and approved by the HOD — open <strong>Settings → Grading Configuration</strong>.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Finalised", value: finalised.length, color: "text-blue-600 bg-blue-50", icon: FileText },
          { label: "Avg. Score", value: avgPercent === "N/A" ? "N/A" : `${avgPercent}%`, color: "text-violet-600 bg-violet-50", icon: BarChart3 },
          { label: "Submitted", value: submittedCount, color: "text-amber-600 bg-amber-50", icon: Clock },
          { label: "Approved", value: approvedCount, color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
          { label: "Pending", value: pendingCount, color: "text-gray-600 bg-gray-50", icon: Eye },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.15rem" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score Distribution Chart */}
      {scoreDistribution.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="mb-4">Score Distribution</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0B5ED7" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5">
          {(["all", "submitted", "approved", "pending"] as GradeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg border transition-colors capitalize flex items-center gap-1 ${
                activeTab === tab ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
              }`}
              style={{ fontSize: "0.8rem" }}
            >
              {tab}
              <span className={`px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-white/20" : "bg-secondary"}`} style={{ fontSize: "0.65rem" }}>
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
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
      </div>

      {/* Table */}
      <div className="space-y-4">
        {/* ── Mobile card list (hidden on desktop) ── */}
        <div className="lg:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border" style={{ fontSize: "0.85rem" }}>No grades found for the current filter.</div>
          ) : (
            filtered.map((g) => (
              <div
                key={g.id}
                className={`bg-card border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/30 transition-colors ${selectedId === g.id ? "border-primary" : "border-border"}`}
                onClick={() => setSelectedId(g.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{g.studentName}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{g.studentId}</p>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-lg text-sm ${g.finalPercent !== null ? "bg-blue-50 text-blue-700" : "bg-secondary text-muted-foreground"}`}>
                    {g.finalPercent !== null ? `${Number(g.finalPercent).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="space-y-1 text-muted-foreground" style={{ fontSize: "0.82rem" }}>
                  <p className="truncate">🏢 {g.companyName}</p>
                  {g.supervisorAssigned && <p className="truncate">👤 {g.supervisorAssigned}</p>}
                  {viewRole === "clo" && <p>{g.department.split(" ")[0]}</p>}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <StatusBadge status={g.gradeStatus} />
                  {g.gradeStatus === "Submitted" && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleApprove(g.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleRevision(g.id)} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Revise
                      </button>
                    </div>
                  )}
                  {(g.gradeStatus === "Approved") && (
                    <button onClick={(e) => { e.stopPropagation(); handlePublish(g.id); }} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className="hidden lg:block bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Company</th>
                  {viewRole === "clo" && <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Department</th>}
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Supervisor</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Final Score</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                    <tr
                      key={g.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedId === g.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedId(g.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p style={{ fontSize: "0.85rem" }}>{g.studentName}</p>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">{g.studentId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{g.companyName}</td>
                      {viewRole === "clo" && <td className="px-4 py-3" style={{ fontSize: "0.8rem" }}>{g.department.split(" ")[0]}</td>}
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{g.supervisorAssigned || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-lg ${g.finalPercent !== null ? "bg-blue-50 text-blue-700" : "bg-secondary text-muted-foreground"}`} style={{ fontSize: "0.85rem" }}>
                          {g.finalPercent !== null ? `${Number(g.finalPercent).toFixed(1)}%` : "—"}
                          {g.letterGrade ? ` (${g.letterGrade})` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={g.gradeStatus} /></td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {g.gradeStatus === "Submitted" && (
                            <>
                              <button onClick={() => handleApprove(g.id)} className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600" title="Approve">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleRevision(g.id)} className="p-1.5 rounded-md hover:bg-amber-100 text-amber-600" title="Request Revision">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {g.gradeStatus === "Approved" && (
                            <button onClick={() => handlePublish(g.id)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90">
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={viewRole === "clo" ? 7 : 6} className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                      No grades found for the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {detail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3>Grade Details — {detail.studentName}</h3>
                  <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {[
                    ["Student", detail.studentName], ["ID", detail.studentId],
                    ["Company", detail.companyName], ["Department", detail.department],
                    ["Supervisor", detail.supervisorAssigned || "Not assigned"],
                    ["Final Score", detail.finalPercent !== null ? `${Number(detail.finalPercent).toFixed(1)}% ${detail.letterGrade ? `(${detail.letterGrade})` : ""}` : "Pending"],
                    ["GPA", detail.gpa ?? "—"],
                  ].map(([l, v]) => (
                    <div key={String(l)}>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{l}</p>
                      <p style={{ fontSize: "0.85rem" }}>{v}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Status</p>
                    <StatusBadge status={detail.gradeStatus} />
                  </div>
                </div>

                {detail.gradeStatus === "Submitted" && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <button
                      onClick={() => { handleApprove(detail.id); setSelectedId(null); }}
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Final Grade
                    </button>
                    <button
                      onClick={() => { handleRevision(detail.id); setSelectedId(null); }}
                      className="w-full py-2 border border-amber-500 text-amber-700 rounded-lg hover:bg-amber-50 flex items-center justify-center gap-2"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <RotateCcw className="w-4 h-4" /> Request Revision
                    </button>
                  </div>
                )}
                {detail.gradeStatus === "Approved" && (
                  <div className="pt-3 border-t border-border">
                    <button
                      onClick={() => { handlePublish(detail.id); setSelectedId(null); }}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ fontSize: "0.85rem" }}
                    >
                      Publish Grade to Student
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
