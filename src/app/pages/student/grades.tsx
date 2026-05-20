import { useMemo } from "react";
import { useAppContext } from "../../lib/context";
import { getLatestApplicationForStudent } from "../../lib/store";
import { Award, Clock, AlertCircle, Users, BookMarked, ClipboardCheck } from "lucide-react";
import { Card } from "../../components/ui/card";
import { GradeBreakdownCard } from "../../components/grading/grade-breakdown-card";
import { VISITATION_CRITERIA } from "../../types/grading";
import {
  getCompiledGrade,
  getActiveConfig,
  getIndustrialAssessment,
  getSiteVisitation,
} from "../../services/grading-service";

export function StudentGradesPage() {
  const { user, store } = useAppContext();
  const _ = store.compiledGrades.length;
  const myApp = useMemo(() => getLatestApplicationForStudent(user?.studentId || ""), [store.applications, user?.studentId]);

  if (!myApp) {
    return (
      <div className="space-y-6">
        <h1>My Score & Evaluation</h1>
        <Card className="p-12 text-center">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-[#1a1a2e]">No Application Found</h3>
          <p className="text-gray-600 mt-1 text-sm">
            You need to complete an industrial attachment before grades are available.
          </p>
        </Card>
      </div>
    );
  }

  const config = getActiveConfig(myApp.department);
  const compiled = getCompiledGrade(myApp.id);
  const ind = getIndustrialAssessment(myApp.id);
  const visit = getSiteVisitation(myApp.id);

  const isActive = myApp.status === "Active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">My Score & Evaluation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Your attachment evaluation scores and overall performance breakdown.
        </p>
      </div>

      {compiled?.blockedReason && (
        <Card className="p-4 border-amber-200 bg-amber-50 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{compiled.blockedReason}</p>
        </Card>
      )}

      {!compiled || compiled.finalPercent === null ? (
        <Card className="p-8 text-center space-y-3">
          {isActive ? (
            <>
              <Clock className="w-12 h-12 text-[#0B5ED7] mx-auto" />
              <h3 className="text-[#1a1a2e]">Attachment In Progress</h3>
              <p className="text-sm text-gray-600">
                Your attachment is currently active at <strong>{myApp.companyName}</strong>. Your final grade
                will appear here once all required components have been submitted.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-[#1a1a2e]">Grade Not Yet Available</h3>
              <p className="text-sm text-gray-600">
                Your application status is <strong>{myApp.status}</strong>.
              </p>
            </>
          )}

          <Card className="p-4 bg-[#E3F3FF] border-0 max-w-md mx-auto text-left">
            <p className="text-sm text-[#0B5ED7] mb-2">
              <strong>How your grade will be calculated</strong> (Structure {config.structure}):
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Industrial Supervisor: {config.structureWeights.w1}%</li>
              <li>• Departmental Supervisor (Site Visit): {config.structureWeights.w2}%</li>
              {config.structure === "A" && <li>• Attachment Report: {config.structureWeights.w3}%</li>}
              {config.structure === "B" && <li>• Final Presentation: {config.structureWeights.w3}%</li>}
              {config.structure === "C" && (
                <>
                  <li>• Attachment Report: {config.structureWeights.w3}%</li>
                  <li>• Final Presentation: {config.structureWeights.w4 ?? 0}%</li>
                </>
              )}
              {config.structure === "D" && (
                <>
                  {(config.structureWeights.w3 ?? 0) > 0 && (
                    <li>• Attachment Report: {config.structureWeights.w3}%</li>
                  )}
                  {(config.structureWeights.w4 ?? 0) > 0 && (
                    <li>• Final Presentation: {config.structureWeights.w4}%</li>
                  )}
                </>
              )}
            </ul>
          </Card>
        </Card>
      ) : (
        <>
          <GradeBreakdownCard compiled={compiled} studentName={myApp.studentName} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ind && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0B5ED7]" />
                  <h3 className="text-[#1a1a2e]">Industry Supervisor Comments</h3>
                </div>
                <p className="text-sm text-gray-700">{ind.comments || "—"}</p>
                <p className="text-xs text-gray-500">— {ind.submittedBy}, {myApp.companyName}</p>
              </Card>
            )}
            {visit && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-[#0B5ED7]" />
                  <h3 className="text-[#1a1a2e]">Site Visitation Assessment</h3>
                </div>
                
                {visit.ratings && (
                  <div className="space-y-1.5 mt-2 bg-white rounded border border-gray-100 p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Rubric Scores (Max 3.0)</p>
                    {VISITATION_CRITERIA.map(crit => (
                      <div key={crit.key} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-1.5 last:pb-0">
                        <span className="text-gray-600">{crit.label}</span>
                        <span className="font-medium text-[#1a1a2e]">{visit.ratings![crit.key]} / 3</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between font-semibold text-sm">
                      <span className="text-[#1a1a2e]">Total Rubric Score</span>
                      <span className="text-[#0B5ED7]">{Object.values(visit.ratings).reduce<number>((a,b)=>a+b, 0)} / 30</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Supervisor Comments</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{visit.comments || "—"}</p>
                </div>
                
                <p className="text-xs text-gray-500 pt-1">
                  — Evaluated by {visit.submittedBy} on {new Date(visit.visitedAt).toLocaleDateString()}
                  {visit.overriddenBy && ` (Overridden by ${visit.overriddenBy})`}
                </p>
              </Card>
            )}
          </div>

          <Card className="p-4 bg-gray-50">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <ClipboardCheck className="w-4 h-4 text-gray-400 mt-0.5" />
              <span>
                Calculated using <strong>{myApp.department}</strong> Structure {config.structure}.
                Configuration locked for the term.
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
