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

  const ComponentRow = ({ label, score, max, weighted }: { label: string; score: number | null; max: number; weighted?: number | null }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="text-right">
        {score !== null ? (
          <span className="text-xs font-medium">{score} / {max}</span>
        ) : (
          <span className="text-muted-foreground text-xs">Pending</span>
        )}
      </div>
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
              <p className="font-semibold text-sm">In Progress</p>
              <p className="text-muted-foreground text-xs">
                Active at {companyName}. Grade will appear when ready.
              </p>
            </>
          ) : isCompleted ? (
            <>
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="font-semibold text-sm">Pending Compilation</p>
              <p className="text-muted-foreground text-xs">
                Waiting for your DLO to publish your grade.
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
              <ClipboardCheck className="w-4 h-4" /> Scores
            </h3>
            <ComponentRow label="Industrial Assessment"   score={industrialScore}   max={90}  weighted={grade?.industrial_assessment_weighted} />
            <ComponentRow label="Site Visitation"         score={siteVisitScore}    max={30}  weighted={grade?.site_visitation_weighted} />
            <ComponentRow label="Report"                  score={reportScore}       max={20}  weighted={grade?.report_weighted} />
            <ComponentRow label="Presentation"            score={presentationScore} max={20}  weighted={grade?.presentation_weighted} />
            <div className="pt-2 mt-1 flex items-center justify-between border-t border-border">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold text-primary">
                {totalScore !== null ? `${Number(totalScore).toFixed(1)}%` : "—"}
              </span>
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

          {grade?.site_visitation_score && (
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Site Visit Feedback</h3>
              </div>
              <p className="text-xs text-muted-foreground">{grade.site_visitation_score.comments || "—"}</p>
            </Card>
          )}
</>
      )}
    </div>
  );
}
