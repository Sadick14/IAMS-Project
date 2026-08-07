import { useState, useEffect, useCallback } from "react";
import { SkeletonList } from "../../components/skeleton";
import { StatusBadge } from "../../components/status-badge";
import { GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { getNameInitials } from "../../lib/validation";
import { useAppContext } from "../../lib/context";

type FilterTab = "pending" | "approved" | "all";

function normalizeGrade(g: any) {
  const backendStatus = g.status ?? "draft";
  const gradeStatus =
    backendStatus === "calculated" ? "Submitted" :
    backendStatus === "approved"   ? "Approved"  :
    backendStatus === "published"  ? "Published" : "Pending";
  return {
    id: String(g.id),
    studentName: g.internship?.student?.user?.name ?? "—",
    studentId: g.internship?.student?.student_id ?? "—",
    department: g.internship?.student?.department?.name ?? "—",
    companyName: g.internship?.company?.name ?? "—",
    supervisor: g.internship?.academicSupervisor?.user?.name ?? "N/A",
    grade: g.letter_grade ?? "—",
    finalPercent: g.total_score ?? null,
    gpa: g.gpa ?? null,
    gradeStatus, backendStatus,
  };
}

export function HODApprovalsPage() {
  const { selectedTermId } = useAppContext();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    const filters: any = { per_page: 100 };
    if (selectedTermId) {
      filters.academic_term_id = Number(selectedTermId);
    }
    const res = await apiClient.getGrades(filters);
    if (res.success) {
      const data = res.data;
      const filteredData = selectedTermId
        ? data.filter((g: any) => {
            const termId = g.academic_term_id ?? g.term_id ?? g.term?.id ?? g.internship?.academic_term_id ?? g.internship?.term_id ?? g.internship?.term?.id;
            return String(termId) === String(selectedTermId);
          })
        : data;
      setGrades(filteredData.map(normalizeGrade));
    }
    setLoading(false);
  }, [selectedTermId]);

  useEffect(() => { fetchGrades(); }, [fetchGrades, selectedTermId]);

  const pendingApproval = grades.filter((g) => g.gradeStatus === "Submitted");
  const approvedGrades  = grades.filter((g) => g.gradeStatus === "Approved" || g.gradeStatus === "Published");
  const allGraded       = grades.filter((g) => g.finalPercent !== null);

  const displayed = filter === "pending" ? pendingApproval : filter === "approved" ? approvedGrades : allGraded;

  const getGradeColor = (grade: string) => {
    if (["A", "A+", "A-"].includes(grade)) return "bg-emerald-100 text-emerald-700";
    if (["B+", "B", "B-"].includes(grade)) return "bg-blue-100 text-blue-700";
    if (["C+", "C", "C-"].includes(grade)) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Grades</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Final grades for your department. Grade approval is handled by the DLO.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-amber-800" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{pendingApproval.length}</p>
          <p className="text-amber-600 mt-1" style={{ fontSize: "0.8rem" }}>Awaiting DLO Approval</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-emerald-800" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{approvedGrades.length}</p>
          <p className="text-emerald-600 mt-1" style={{ fontSize: "0.8rem" }}>Approved</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p style={{ fontSize: "2rem", lineHeight: 1.1 }}>{allGraded.length}</p>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>Total Graded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {([
          { key: "pending" as const, label: `Pending (${pendingApproval.length})` },
          { key: "approved" as const, label: `Approved (${approvedGrades.length})` },
          { key: "all" as const, label: `All Graded (${allGraded.length})` },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg border transition-colors ${filter === tab.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
            style={{ fontSize: "0.8rem" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grades List */}
      {loading ? (
        <SkeletonList rows={5} />
      ) : displayed.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No grades to display</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            {filter === "pending" ? "No grades are pending DLO approval." : "No grades found for this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((g: any) => {
            const isExpanded = expandedId === g.id;
            return (
              <div key={g.id} className={`bg-card border rounded-xl transition-colors ${g.gradeStatus === "Submitted" ? "border-amber-200" : "border-border"}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : g.id)} className="w-full text-left p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.85rem" }}>
                    {getNameInitials(g.studentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span style={{ fontSize: "0.9rem" }}>{g.studentName}</span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{g.studentId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{g.companyName}</span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Supervisor: {g.supervisor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1.5 rounded-lg ${getGradeColor(g.grade)}`} style={{ fontSize: "1.1rem" }}>{g.grade}</span>
                    <StatusBadge status={g.gradeStatus} />
                  </div>
                  <div className="shrink-0 text-muted-foreground">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border space-y-4 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        ["Student", g.studentName], ["Student ID", g.studentId],
                        ["Department", g.department], ["Company", g.companyName],
                        ["University Supervisor", g.supervisor],
                        ["Final %", g.finalPercent !== null ? `${Number(g.finalPercent).toFixed(1)}%` : "—"],
                        ["GPA", g.gpa ?? "—"], ["Status", g.gradeStatus],
                      ].map(([l, v]) => (
                        <div key={String(l)}>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">{l}</p>
                          <p style={{ fontSize: "0.85rem" }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-secondary/30 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>FINAL GRADE</p>
                        <p className="text-primary" style={{ fontSize: "2rem", lineHeight: 1.1 }}>{g.grade}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>STATUS</p>
                        <StatusBadge status={g.gradeStatus} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
