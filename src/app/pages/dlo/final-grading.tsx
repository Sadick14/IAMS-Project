import { useState, useEffect, useCallback } from "react";
import { SkeletonTable } from "../../components/skeleton";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { AlertTriangle, GraduationCap, RefreshCw, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";

interface Row {
  internshipId: string;
  gradeId: string | null;
  studentName: string;
  studentId: string;
  companyName: string;
  gradeStatus: string | null;   // backend: draft|calculated|approved|published
  industrialScore: number | null;
  siteVisitScore: number | null;
  reportScore: number | null;
  presentationScore: number | null;
  finalPercent: number | null;
  letterGrade: string | null;
}

export function DLOFinalGradingPage() {
  const { user } = useAppContext();
  const department = user?.department || "";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [internRes, gradesRes] = await Promise.all([
      apiClient.getInternships({ status: "active,completed", per_page: 100, department }),
      apiClient.getGrades({ per_page: 100, department }),
    ]);

    const gradeByInternship = new Map<string, any>();
    if (gradesRes.success) {
      for (const g of gradesRes.data) {
        gradeByInternship.set(String(g.internship_id ?? g.internship?.id), g);
      }
    }

    if (internRes.success) {
      setRows(internRes.data.map((i: any) => {
        const g = gradeByInternship.get(String(i.id));
        return {
          internshipId: String(i.id),
          gradeId: g?.id != null ? String(g.id) : null,
          studentName: i.student?.user?.name ?? "—",
          studentId: i.student?.student_id ?? "—",
          companyName: i.company?.name ?? "—",
          gradeStatus: g?.status ?? null,
          industrialScore: g?.industrial_assessment_score ?? null,
          siteVisitScore: g?.site_visitation_score ?? null,
          reportScore: g?.report_score ?? null,
          presentationScore: g?.presentation_score ?? null,
          finalPercent: g?.total_score ?? null,
          letterGrade: g?.letter_grade ?? null,
        };
      }));
    }
    setLoading(false);
  }, [department]);

  useEffect(() => { load(); }, [load]);

  const displayStatus = (s: string | null) =>
    s === "calculated" ? "Ready for Approval" : s === "approved" ? "Approved" : s === "published" ? "Published" : "Pending";

  const handleCompile = async (internshipId: string) => {
    setCompiling(internshipId);
    const res = await apiClient.compileGrade(internshipId);
    setCompiling(null);
    if (res.success) {
      toast.success(res.message ?? "Final grade compiled from submitted components.");
      load();
    } else {
      toast.error(res.message ?? "Could not compile — ensure all component scores are submitted and approved.");
    }
  };

  const handleApprove = async (gradeId: string) => {
    setApproving(gradeId);
    const res = await apiClient.approveGrade(gradeId);
    setApproving(null);
    if (res.success) {
      toast.success(res.message ?? "Grade approved.");
      load();
    } else {
      toast.error(res.message ?? "Failed to approve grade.");
    }
  };

  const handlePublish = async (gradeId: string) => {
    setPublishing(gradeId);
    const res = await apiClient.publishGrade(gradeId);
    setPublishing(null);
    if (res.success) {
      toast.success(res.message ?? "Grade published to student.");
      load();
    } else {
      toast.error(res.message ?? "Failed to publish grade.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Final Grading</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Compile final grades from submitted component scores (industrial assessment, site visitation, report, presentation).
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-800" style={{ fontSize: "0.8rem" }}>
          <p><strong>Workflow:</strong> Compile the grade from all submitted component scores → Approve the final grade → Publish to make it visible to the student.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3>Students Awaiting Final Grading</h3>
          <button onClick={load} className="text-primary hover:underline flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {loading ? (
          <SkeletonTable rows={5} cols={5} showFilters={false} />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No active or completed internships.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-center px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Industrial</th>
                  <th className="text-center px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Site Visit</th>
                  <th className="text-center px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Report</th>
                  <th className="text-center px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Present.</th>
                  <th className="text-center px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Final</th>
                  <th className="text-left px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-right px-4 py-2.5" style={{ fontSize: "0.75rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.internshipId} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                      <div>
                        <p>{r.studentName}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{r.studentId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.industrialScore !== null
                        ? <span className="font-medium">{Number(r.industrialScore).toFixed(1)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.siteVisitScore !== null
                        ? <span className="font-medium">{Number(r.siteVisitScore).toFixed(1)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.reportScore !== null
                        ? <span className="font-medium">{Number(r.reportScore).toFixed(1)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.presentationScore !== null
                        ? <span className="font-medium">{Number(r.presentationScore).toFixed(1)}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.finalPercent !== null
                        ? <span className="font-medium">{Number(r.finalPercent).toFixed(1)}%{r.letterGrade ? ` (${r.letterGrade})` : ""}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={displayStatus(r.gradeStatus)} /></td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.gradeStatus === "draft" || !r.gradeStatus ? (
                        <button onClick={() => handleCompile(r.internshipId)} disabled={compiling === r.internshipId}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {compiling === r.internshipId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling…</>
                            : <><GraduationCap className="w-3.5 h-3.5" /> Compile</>}
                        </button>
                      ) : r.gradeStatus === "calculated" ? (
                        <button onClick={() => handleApprove(r.gradeId!)} disabled={approving === r.gradeId}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {approving === r.gradeId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Approving…</>
                            : <><CheckCircle2 className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                      ) : r.gradeStatus === "approved" ? (
                        <button onClick={() => handlePublish(r.gradeId!)} disabled={publishing === r.gradeId}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {publishing === r.gradeId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing…</>
                            : <><Send className="w-3.5 h-3.5" /> Publish</>}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600" style={{ fontSize: "0.8rem" }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
