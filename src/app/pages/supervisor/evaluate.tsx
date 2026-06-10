import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { CheckCircle2, Clock, Loader2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { IndustrialAssessmentForm } from "../../components/grading/industrial-assessment-form";
import { WeeklyRubricForm } from "../../components/grading/weekly-rubric-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import {
  getActiveConfig,
  getIndustrialAssessment,
} from "../../services/grading-service";
import type { GradingActor, WeeklyRubricRatings } from "../../types/grading";

type TabKey = "weekly" | "final";

function getInternshipId(item: any): string {
  return String(item?.id ?? item?.internship_id ?? item?.applicationId ?? "");
}

function getStudentName(item: any): string {
  return item?.student?.user?.name ?? item?.studentName ?? "Student";
}

function getStudentId(item: any): string {
  return item?.student?.student_id ?? item?.studentId ?? "N/A";
}

function getCompanyName(item: any): string {
  return item?.company?.name ?? item?.companyName ?? "Company";
}

function getDepartmentName(item: any): string {
  return item?.student?.department?.name ?? item?.student?.department ?? item?.department ?? "";
}

function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildWeeksForInternship(item: any) {
  // Use approved term dates (confirmed_start_date, confirmed_end_date)
  // These are the dates approved for the current term
  const startIso = toIsoDate(item?.confirmed_start_date ?? item?.start_date);
  const endIso = toIsoDate(item?.confirmed_end_date ?? item?.end_date);

  if (!startIso || !endIso) {
    console.warn("Missing internship dates for weeks calculation", {
      confirmed_start_date: item?.confirmed_start_date,
      confirmed_end_date: item?.confirmed_end_date,
      start_date: item?.start_date,
      end_date: item?.end_date,
    });
    return [];
  }

  const weeks = [];
  let cursor = new Date(startIso);
  const end = new Date(endIso);
  let weekNumber = 1;

  while (cursor <= end) {
    const weekStart = cursor.toISOString().slice(0, 10);
    const weekEnd = addDays(cursor, 6);
    weeks.push({
      weekNumber,
      weekStart,
      weekEnd: (weekEnd > end ? end : weekEnd).toISOString().slice(0, 10),
    });
    cursor = addDays(cursor, 7);
    weekNumber += 1;
  }
  return weeks;
}

function getCurrentWeekNumberFromWeeks(weeks: Array<{ weekNumber: number; weekStart: string; weekEnd: string }>): number {
  const today = new Date().toISOString().slice(0, 10);
  return weeks.find((w) => today >= w.weekStart && today <= w.weekEnd)?.weekNumber ?? 0;
}

export function EvaluatePage() {
  const { user, store } = useAppContext();
  const _ = store.industrialAssessments.length + store.weeklyRubrics.length;
  const [assignedInternships, setAssignedInternships] = useState<any[]>([]);
  const [rubricsByWeek, setRubricsByWeek] = useState<Record<number, { ratings: Record<string, string>; notes: string }>>({});

  const { execute: runEvaluationAction, loading: isSubmitting } = useToastAction();

  const [params, setParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    apiClient.getDashboard("industry-supervisor").then((res) => {
      if (!cancelled && res.success) {
        // Backend already scopes assigned_internships to this supervisor
        setAssignedInternships(res.data?.assigned_internships ?? []);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const activeApps = assignedInternships;

  const initialAppId = params.get("student") || getInternshipId(activeApps[0]) || "";
  const [appId, setAppId] = useState<string>(initialAppId);
  const app = activeApps.find((a) => getInternshipId(a) === appId);

  // SECURITY: Backend filters by supervisor_id parameter

  useEffect(() => {
    if (!appId && activeApps.length > 0) setAppId(getInternshipId(activeApps[0]));
  }, [activeApps, appId]);

  useEffect(() => {
    if (!appId) {
      setRubricsByWeek({});
      return;
    }
    let cancelled = false;
    apiClient.getWeeklyRubrics(appId).then((res) => {
      if (cancelled || !res.success) return;
      const map: Record<number, { ratings: Record<string, string>; notes: string }> = {};
      for (const rubric of res.data) {
        map[rubric.week_number] = { ratings: rubric.ratings ?? {}, notes: rubric.notes ?? "" };
      }
      setRubricsByWeek(map);
    });
    return () => { cancelled = true; };
  }, [appId]);

  // Default tab: deep-link wins → otherwise Weekly (the most-frequent action).
  const initialTab: TabKey = (params.get("tab") as TabKey) || "weekly";
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Weeks for the selected student.
  const weeks = useMemo(
    () => (app ? buildWeeksForInternship(app) : []),
    [app]
  );
  const currentWeekNumber = useMemo(() => getCurrentWeekNumberFromWeeks(weeks), [weeks]);

  // Pick the deep-linked week, else the most overdue unfilled, else current, else 1.
  const defaultWeek = useMemo(() => {
    const fromUrl = parseInt(params.get("week") || "0", 10);
    if (fromUrl > 0 && weeks.some((w) => w.weekNumber === fromUrl)) return fromUrl;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = weeks.find((w) => w.weekEnd < today && !rubricsByWeek[w.weekNumber]);
    return overdue?.weekNumber || currentWeekNumber || weeks[0]?.weekNumber || 1;
  }, [appId, weeks, currentWeekNumber, rubricsByWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const [weekNumber, setWeekNumber] = useState<number>(defaultWeek);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<number, boolean>>({});

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
  const existingWeekly = appId && week ? rubricsByWeek[weekNumber] : undefined;

  const config = useMemo(() => (app ? getActiveConfig(getDepartmentName(app)) : null), [app]);
  const existingFinal = appId ? getIndustrialAssessment(appId) : undefined;

  const filledWeeks = appId ? weeks.filter((w) => !!rubricsByWeek[w.weekNumber]).length : 0;

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
          Weekly progress check-ins and the end-of-attachment Industrial Assessment
          (18 criteria across 4 sections) — all in one place per student.
        </p>
      </div>

      <Card className="p-4">
        <label className="text-sm text-gray-700 block mb-2">Student</label>
        {activeApps.length > 0 ? (
          <Select value={appId} onValueChange={setAppId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a student" /></SelectTrigger>
            <SelectContent>
              {activeApps.map((a) => (
                <SelectItem key={getInternshipId(a)} value={getInternshipId(a)}>
                  {getStudentName(a)} ({getStudentId(a)}) - {getCompanyName(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-gray-600">No assigned internships found for your account yet.</p>
        )}
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
              Industrial Assessment
              {existingFinal && (
                <CheckCircle2 className="ml-2 size-3.5 text-emerald-600" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-4 space-y-4">
            <Card className="p-4">
              <div className="text-sm text-gray-700">
                <span className="text-[#1a1a2e]">{filledWeeks}</span> of{" "}
                <span className="text-[#1a1a2e]">{weeks.length}</span> weeks recorded
                {weeks.length > 0 && filledWeeks < weeks.length && (
                  <span className="text-amber-700 ml-2">
                    · {weeks.length - filledWeeks} pending
                  </span>
                )}
              </div>
            </Card>

            {weeks.length > 0 ? (
              <div className="space-y-3">
                {weeks.map((w) => {
                  const filled = !!rubricsByWeek[w.weekNumber];
                  const isCurrent = w.weekNumber === currentWeekNumber;
                  const isExpanded = weekNumber === w.weekNumber && !collapsedWeeks[w.weekNumber];
                  const weekRange = `${new Date(w.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(w.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

                  return (
                    <Card key={w.weekNumber} className="overflow-hidden">
                      <button
                        onClick={() => {
                          setWeekNumber(w.weekNumber);
                          setCollapsedWeeks((prev) => ({
                            ...prev,
                            [w.weekNumber]: !prev[w.weekNumber],
                          }));
                        }}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div>
                            <p className="font-medium text-sm">
                              Week {w.weekNumber} — {weekRange}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isCurrent && !filled && "Current week"}
                              {isCurrent && filled && "Current week (completed)"}
                              {!isCurrent && !filled && "Pending"}
                              {!isCurrent && filled && "Completed"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {filled && <CheckCircle2 className="size-4 text-emerald-600" />}
                          {isCurrent && !filled && <Clock className="size-4 text-blue-600" />}
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border p-6 bg-muted/20">
                          <WeeklyRubricForm
                            weekNumber={w.weekNumber}
                            weekStart={w.weekStart}
                            weekEnd={w.weekEnd}
                            initialRatings={rubricsByWeek[w.weekNumber]?.ratings as WeeklyRubricRatings | undefined}
                            initialNotes={rubricsByWeek[w.weekNumber]?.notes}
                            onSubmit={async (ratings, notes) => {
                              const result = await runEvaluationAction(async () => {
                                return apiClient.submitWeeklyRubric(getInternshipId(app), w.weekNumber, ratings, notes, actor);
                              }, {
                                successMessage: "Weekly rubric submitted successfully!",
                                errorMessage: "Failed to submit weekly rubric."
                              });
                              if (result?.success) {
                                setRubricsByWeek((prev) => ({
                                  ...prev,
                                  [w.weekNumber]: { ratings, notes },
                                }));
                              }
                            }}
                          />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
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
                      return apiClient.submitIndustrialAssessment(getInternshipId(app), ratings, comments, actor);
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
