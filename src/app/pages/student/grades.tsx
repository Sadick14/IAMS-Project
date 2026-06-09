import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api-client";
import { Award, AlertCircle, Clock, Users, BookMarked, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/card";
import { SkeletonFormCard, SkeletonStatCards } from "../../components/skeleton";

export function StudentGradesPage() {
  const [internship, setInternship] = useState<any>(null);
  const [grade, setGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getDashboard("student").then(async (dashRes) => {
      const active = dashRes.data?.active_internship;
      setInternship(active ?? null);

      if (active?.id) {
        const gradeRes = await apiClient.getGrade(String(active.id));
        if (gradeRes.success) setGrade(gradeRes.data?.grade ?? gradeRes.data ?? null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Score & Evaluation</h1>
        <SkeletonStatCards count={4} />
        <SkeletonFormCard rows={6} />
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Score & Evaluation</h1>
        <Card className="p-6 text-center">
          <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No active internship</p>
        </Card>
      </div>
    );
  }

  const isActive    = internship.status === "active";
  const isCompleted = internship.status === "completed";
  const companyName = internship.company?.name ?? "—";

  // Grade component scores
  const industrialScore   = grade?.industrial_assessment_score ?? null;
  const siteVisitScore    = grade?.site_visitation_score       ?? null;
  const reportScore       = grade?.report_score                ?? null;
  const presentationScore = grade?.presentation_score         ?? null;
  const totalScore        = grade?.total_score                 ?? null;
  const letterGrade       = grade?.letter_grade                ?? null;
  const gpa               = grade?.gpa                        ?? null;
  const gradeStatus       = grade?.status                     ?? null;

  const ComponentRow = ({ label, score, max, weighted, evaluator }: { label: string; score: number | null; max: number; weighted?: number | null; evaluator?: string }) => (
    <div className="space-y-1.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{label}</p>
          {evaluator && <p className="text-muted-foreground text-xs">{evaluator}</p>}
        </div>
        <div className="text-right shrink-0">
          {score !== null ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-medium">{Number(score).toFixed(1)} / {max}</span>
              {weighted !== null && weighted !== undefined && (
                <span className="text-muted-foreground text-xs">·  {weighted}% weight</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">Pending</span>
          )}
        </div>
      </div>
      <div className="h-px bg-border" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Score & Evaluation</h1>
        <p className="text-muted-foreground text-sm mt-1">Your internship performance</p>
      </div>

      {!grade || totalScore === null ? (
        <Card className="p-6 text-center space-y-2">
          {isActive ? (
            <>
              <Clock className="w-10 h-10 text-blue-500 mx-auto" />
              <p className="font-semibold text-sm">Evaluation in Progress</p>
              <p className="text-muted-foreground text-xs">
                Your supervisor and academic supervisor are currently evaluating your performance. Your grade will appear once all evaluations are complete and approved by your DLO.
              </p>
            </>
          ) : isCompleted ? (
            <>
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-semibold text-sm">Grade Under Review</p>
              <p className="text-muted-foreground text-xs">
                Your evaluations are complete. Your DLO is reviewing and compiling your final grade. This may take a few days.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-semibold text-sm">Not Available</p>
              <p className="text-muted-foreground text-xs">
                Status: {internship.status}
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* Final Grade Banner */}
          <Card className={`p-4 ${gradeStatus === "published" ? "border-emerald-200 bg-emerald-50" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${
                gradeStatus === "published" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
              }`}>
                {letterGrade ?? "—"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">
                  {totalScore !== null ? `${Number(totalScore).toFixed(1)}%` : "—"}
                </p>
                <p className="text-muted-foreground text-xs">GPA: {gpa ?? "—"} / 4.0</p>
                {gradeStatus === "published" && (
                  <div className="flex items-center gap-1 text-emerald-700 text-xs mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Published</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Component Breakdown */}
          <Card className="p-4 space-y-0">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> Score Breakdown
            </h3>
            <ComponentRow
              label="Industrial Assessment"
              score={industrialScore}
              max={90}
              weighted={grade?.industrial_assessment_weighted}
              evaluator="Evaluated by your company supervisor"
            />
            <ComponentRow
              label="Site Visitation"
              score={siteVisitScore}
              max={30}
              weighted={grade?.site_visitation_weighted}
              evaluator="Evaluated by your academic supervisor"
            />
            <ComponentRow
              label="Report"
              score={reportScore}
              max={20}
              weighted={grade?.report_weighted}
              evaluator="Evaluated by your academic supervisor"
            />
            <ComponentRow
              label="Presentation"
              score={presentationScore}
              max={20}
              weighted={grade?.presentation_weighted}
              evaluator="Evaluated by your academic supervisor"
            />
            <div className="pt-2 mt-1 flex items-center justify-between border-t border-border">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold text-primary">
                {totalScore !== null ? `${Number(totalScore).toFixed(1)}%` : "—"}
              </span>
            </div>
          </Card>

          {/* Grade Scale Legend */}
          <Card className="p-4 bg-muted/30">
            <h3 className="text-sm font-semibold mb-3">Grade Scale</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-medium">A</span> <span className="text-muted-foreground">80–100%</span></div>
              <div><span className="font-medium">B+</span> <span className="text-muted-foreground">75–79%</span></div>
              <div><span className="font-medium">B</span> <span className="text-muted-foreground">70–74%</span></div>
              <div><span className="font-medium">C+</span> <span className="text-muted-foreground">65–69%</span></div>
              <div><span className="font-medium">C</span> <span className="text-muted-foreground">60–64%</span></div>
              <div><span className="font-medium">D</span> <span className="text-muted-foreground">50–59%</span></div>
              <div className="col-span-2"><span className="font-medium">F</span> <span className="text-muted-foreground">Below 50%</span></div>
            </div>
          </Card>

          {/* Supervisor Comments */}
          {grade?.industrial_assessment && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Supervisor Comments</h3>
              </div>
              <p className="text-xs text-muted-foreground">{grade.industrial_assessment.general_comments || "—"}</p>
            </Card>
          )}

          {grade?.site_visitation_assessment && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Site Visit Feedback</h3>
              </div>
              <p className="text-xs text-muted-foreground">{grade.site_visitation_assessment.comments || "—"}</p>
            </Card>
          )}
</>
      )}
    </div>
  );
}
