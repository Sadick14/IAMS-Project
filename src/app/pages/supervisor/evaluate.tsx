import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { IndustrialAssessmentForm } from "../../components/grading/industrial-assessment-form";
import { WeeklyRubricForm } from "../../components/grading/weekly-rubric-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import {
  getActiveConfig,
  getIndustrialAssessment,
  getWeeksForApplication,
  getCurrentWeekNumber,
  getWeeklyRubric,
} from "../../services/grading-service";
import type { GradingActor } from "../../types/grading";

type TabKey = "weekly" | "final";

export function EvaluatePage() {
  const { user, store } = useAppContext();
  const _ = store.industrialAssessments.length + store.weeklyRubrics.length;

  const { execute: runEvaluationAction, loading: isSubmitting } = useToastAction();

  const [params, setParams] = useSearchParams();

  // Industrial supervisors see students attached to their company.
  // For mock purposes, show all active students; in production filter by supervisor.
  const activeApps = store.applications.filter((a) => a.status === "Active" || a.status === "Completed");

  const initialAppId = params.get("student") || activeApps[0]?.id || "";
  const [appId, setAppId] = useState<string>(initialAppId);
  const app = activeApps.find((a) => a.id === appId);

  // Default tab: deep-link wins → otherwise Weekly (the most-frequent action).
  const initialTab: TabKey = (params.get("tab") as TabKey) || "weekly";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Weeks for the selected student.
  const weeks = useMemo(
    () => (appId ? getWeeksForApplication(appId) : []),
    [appId, store.applications.length, store.terms.length]
  );
  const currentWeekNumber = useMemo(() => (appId ? getCurrentWeekNumber(appId) : 0), [appId]);

  // Pick the deep-linked week, else the most overdue unfilled, else current, else 1.
  const defaultWeek = useMemo(() => {
    const fromUrl = parseInt(params.get("week") || "0", 10);
    if (fromUrl > 0 && weeks.some((w) => w.weekNumber === fromUrl)) return fromUrl;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = weeks.find((w) => w.weekEnd < today && !getWeeklyRubric(appId, w.weekNumber));
    return overdue?.weekNumber || currentWeekNumber || weeks[0]?.weekNumber || 1;
  }, [appId, weeks, currentWeekNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const [weekNumber, setWeekNumber] = useState<number>(defaultWeek);

  // Keep state in sync with URL deep-links and student switches.
  useEffect(() => { setWeekNumber(defaultWeek); }, [defaultWeek]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (appId) next.set("student", appId); else next.delete("student");
    next.set("tab", tab);
    if (tab === "weekly" && weekNumber) next.set("week", String(weekNumber));
    else next.delete("week");
    setParams(next, { replace: true });
  }, [appId, tab, weekNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const week = weeks.find((w) => w.weekNumber === weekNumber);
  const existingWeekly = appId && week ? getWeeklyRubric(appId, weekNumber) : undefined;

  const config = useMemo(() => (app ? getActiveConfig(app.department) : null), [app]);
  const existingFinal = appId ? getIndustrialAssessment(appId) : undefined;

  const filledWeeks = appId ? weeks.filter((w) => !!getWeeklyRubric(appId, w.weekNumber)).length : 0;

  const actor: GradingActor = {
    id: user?.id ?? "u-sup",
    name: user?.name ?? "Industrial Supervisor",
    role: "supervisor",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-[#1a1a2e]">Student Assessments</h1>
        <p className="text-sm text-gray-600 mt-1">
          Weekly progress check-ins (qualitative) and the end-of-attachment Final
          Assessment (scored, 20 criteria) — all in one place per student.
        </p>
      </div>

      <Card className="p-4">
        <label className="text-sm text-gray-700 block mb-2">Student</label>
        <Select value={appId} onValueChange={setAppId}>
          <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a student" /></SelectTrigger>
          <SelectContent>
            {activeApps.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.studentName} ({a.studentId}) — {a.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {app && (
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium text-foreground">Saving assessment...</p>
              </div>
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="weekly">
              Weekly Rubric
              {weeks.length > 0 && (
                <Badge className="ml-2 bg-[#0B5ED7]/10 text-[#0B5ED7] border-0">
                  {filledWeeks}/{weeks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="final">
              Final Assessment
              {existingFinal && (
                <CheckCircle2 className="ml-2 size-3.5 text-emerald-600" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4 space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-gray-700">
                  <span className="text-[#1a1a2e]">{filledWeeks}</span> of{" "}
                  <span className="text-[#1a1a2e]">{weeks.length}</span> weeks recorded
                  {weeks.length > 0 && filledWeeks < weeks.length && (
                    <span className="text-amber-700 ml-2">
                      · {weeks.length - filledWeeks} pending
                    </span>
                  )}
                </div>
                <div className="min-w-[14rem]">
                  <Select
                    value={String(weekNumber)}
                    onValueChange={(v) => setWeekNumber(parseInt(v, 10))}
                    disabled={weeks.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a week" /></SelectTrigger>
                    <SelectContent>
                      {weeks.map((w) => {
                        const filled = !!getWeeklyRubric(appId, w.weekNumber);
                        const isCurrent = w.weekNumber === currentWeekNumber;
                        return (
                          <SelectItem key={w.weekNumber} value={String(w.weekNumber)}>
                            <span className="inline-flex items-center gap-2">
                              Week {w.weekNumber} —{" "}
                              {new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              {filled && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                              {isCurrent && !filled && <Clock className="size-3.5 text-[#0B5ED7]" />}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {week ? (
              <Card className="p-6">
                <WeeklyRubricForm
                  weekNumber={week.weekNumber}
                  weekStart={week.weekStart}
                  weekEnd={week.weekEnd}
                  initialRatings={existingWeekly?.ratings}
                  initialNotes={existingWeekly?.notes}
                  onSubmit={async (ratings, notes) => {
                    await runEvaluationAction(async () => {
                      return apiClient.submitWeeklyRubric(app.id, week.weekNumber, ratings, notes, actor);
                    }, {
                      successMessage: "Weekly rubric submitted successfully!",
                      errorMessage: "Failed to submit weekly rubric."
                    });
                  }}
                />
              </Card>
            ) : (
              <Card className="p-6 text-sm text-gray-600">
                No weeks available — the active term may not yet have an internship date range.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="final" className="mt-4 space-y-4">
            {weeks.length > 0 && filledWeeks < weeks.length && (
              <Card className="p-3 bg-amber-50 border-amber-200">
                <div className="text-sm text-amber-800">
                  Heads up — {weeks.length - filledWeeks} weekly rubric{weeks.length - filledWeeks > 1 ? "s are" : " is"} still pending.
                  The Final Assessment is normally completed at the end of the attachment.
                </div>
              </Card>
            )}
            {config ? (
              <Card className="p-6">
                <IndustrialAssessmentForm
                  sectionWeights={config.sectionWeights}
                  initialRatings={existingFinal?.ratings}
                  initialComments={existingFinal?.comments}
                  onSubmit={async (ratings, comments) => {
                    await runEvaluationAction(async () => {
                      return apiClient.submitIndustrialAssessment(app.id, ratings, comments, actor);
                    }, {
                      successMessage: "Final assessment submitted successfully!",
                      errorMessage: "Failed to submit final assessment."
                    });
                  }}
                />
              </Card>
            ) : (
              <Card className="p-6 text-sm text-gray-600">
                No grading configuration found for this student's department.
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
}
