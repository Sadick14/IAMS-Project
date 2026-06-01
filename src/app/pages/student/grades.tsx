import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api-client";
import { Award, Clock, AlertCircle, Users, BookMarked, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/card";

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
      <div className="space-y-6">
        <h1>My Score &amp; Evaluation</h1>
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading grade data…</p>
        </Card>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="space-y-6">
        <h1>My Score &amp; Evaluation</h1>
        <Card className="p-12 text-center">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-[#1a1a2e]">No Active Internship</h3>
          <p className="text-gray-600 mt-1 text-sm">
            You need to complete an industrial attachment before grades are available.
          </p>
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
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>{label}</span>
      <div className="text-right">
        {score !== null ? (
          <>
            <span style={{ fontSize: "0.9rem" }}>{score} / {max}</span>
            {weighted !== null && weighted !== undefined && (
              <span className="text-muted-foreground ml-2" style={{ fontSize: "0.75rem" }}>({Number(weighted).toFixed(1)} weighted)</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>Pending</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">My Score &amp; Evaluation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Your attachment evaluation scores and overall performance breakdown.
        </p>
      </div>

      {!grade || totalScore === null ? (
        <Card className="p-8 text-center space-y-3">
          {isActive ? (
            <>
              <Clock className="w-12 h-12 text-[#0B5ED7] mx-auto" />
              <h3 className="text-[#1a1a2e]">Attachment In Progress</h3>
              <p className="text-sm text-gray-600">
                Your attachment is currently active at <strong>{companyName}</strong>. Your final grade
                will appear here once all required components have been submitted and approved.
              </p>
            </>
          ) : isCompleted ? (
            <>
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-[#1a1a2e]">Grade Not Yet Compiled</h3>
              <p className="text-sm text-gray-600">
                Your attachment is complete. Waiting for your DLO to compile and publish your final grade.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-[#1a1a2e]">Grade Not Yet Available</h3>
              <p className="text-sm text-gray-600">
                Status: <strong>{internship.status}</strong>
              </p>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* Final Grade Banner */}
          <Card className={`p-6 ${gradeStatus === "published" ? "border-emerald-200 bg-emerald-50" : "border-primary/20 bg-primary/5"}`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  gradeStatus === "published" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                }`}>
                  {letterGrade ?? "—"}
                </div>
                <div>
                  <p className="text-[#1a1a2e] font-bold" style={{ fontSize: "1.5rem" }}>
                    {totalScore !== null ? `${Number(totalScore).toFixed(1)}%` : "—"}
                  </p>
                  <p className="text-gray-600 text-sm">GPA: {gpa ?? "—"} / 4.0</p>
                  <p className="text-muted-foreground text-xs mt-0.5 capitalize">Status: {gradeStatus ?? "draft"}</p>
                </div>
              </div>
              {gradeStatus === "published" && (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span style={{ fontSize: "0.85rem" }}>Grade Published</span>
                </div>
              )}
            </div>
          </Card>

          {/* Component Breakdown */}
          <Card className="p-5 space-y-1">
            <h3 className="text-[#1a1a2e] mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#0B5ED7]" /> Component Scores
            </h3>
            <ComponentRow label="Industrial Assessment (max 90)"   score={industrialScore}   max={90}  weighted={grade?.industrial_assessment_weighted} />
            <ComponentRow label="Site Visitation (max 30)"          score={siteVisitScore}    max={30}  weighted={grade?.site_visitation_weighted} />
            <ComponentRow label="Report (max 20)"                   score={reportScore}       max={20}  weighted={grade?.report_weighted} />
            <ComponentRow label="Presentation (max 20)"             score={presentationScore} max={20}  weighted={grade?.presentation_weighted} />
            <div className="pt-3 mt-1 flex items-center justify-between border-t border-border">
              <span style={{ fontSize: "0.9rem" }}>Total</span>
              <span style={{ fontSize: "1rem" }} className="font-bold text-[#0B5ED7]">
                {totalScore !== null ? `${Number(totalScore).toFixed(1)}%` : "—"}
              </span>
            </div>
          </Card>

          {/* Supervisor Comments */}
          {grade?.industrial_assessment && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0B5ED7]" />
                <h3 className="text-[#1a1a2e]">Industry Supervisor Comments</h3>
              </div>
              <p className="text-sm text-gray-700">{grade.industrial_assessment.general_comments || "—"}</p>
            </Card>
          )}

          {grade?.site_visitation_score && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-[#0B5ED7]" />
                <h3 className="text-[#1a1a2e]">Site Visitation Feedback</h3>
              </div>
              <p className="text-sm text-gray-700">{grade.site_visitation_score.comments || "—"}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
