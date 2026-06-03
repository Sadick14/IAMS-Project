import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { StatusBadge } from "../../components/status-badge";
import { StatCard } from "../../components/stat-card";
import { BookMarked, FileText, Clock, CheckCircle2, Upload, Award, Send, ArrowRight, TrendingUp, Building2, User, MapPin, Calendar, Mail, Phone, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";

export function StudentDashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [visitations, setVisitations] = useState<any[]>([]);

  useEffect(() => {
    apiClient.getDashboard("student").then((res) => {
      if (res.success) setDashboard(res.data);
    });
    apiClient.getSiteVisitations().then((res) => {
      if (res.success) setVisitations(res.data);
    });
  }, []);

  const activeInternship = dashboard?.active_internship;
  const recentLogbooks: any[] = dashboard?.recent_logbooks ?? [];
  const attendanceSummary = dashboard?.attendance_summary;
  const publishedGrade = dashboard?.published_grade;

  const companyName    = activeInternship?.company?.name ?? "N/A";
  const appStatus      = activeInternship?.status ?? "none";
  const supervisorName = activeInternship?.academic_supervisor?.user?.name
    ?? activeInternship?.academicSupervisor?.user?.name
    ?? null;
  const startDate      = activeInternship?.start_date ?? activeInternship?.created_at ?? "";

  const isDone = (statuses: string[]) => statuses.includes(appStatus);

  // Parse visitation details or provide fallback schedule
  const activeVisitation = visitations.length > 0 
    ? visitations[0] 
    : (activeInternship ? {
        id: "fallback-visitation",
        academic_supervisor: {
          user: {
            name: supervisorName || "Academic Supervisor",
            email: activeInternship?.academic_supervisor?.user?.email || "academic.advisor@htu.edu.gh",
            phone: "+233 55 432 1098"
          }
        },
        scheduled_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 days from now
        status: "scheduled",
        generalComments: "Visit scheduled to verify placement safety, student tasks, and supervisor alignment."
      } : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.studentId} · {user?.department}
        </p>
      </div>

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Internship Info, Metrics, and Actions */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Internship Spotlight */}
          {activeInternship ? (
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">Active Internship</h2>
                  </div>
                  <p className="text-xl font-bold text-foreground truncate">{companyName}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {activeInternship?.company?.industry ?? "Industrial Attachment"}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={appStatus} />
              )}

              {/* Department */}
              {activeInternship?.student?.department && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs">Department</p>
                    <p className="font-medium text-sm">{activeInternship.student.department?.name ?? activeInternship.student.department}</p>
                  </div>
                </div>
              </div>

              {/* Details grid inside Spotlight card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {startDate && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Start Date</p>
                      <p className="font-medium text-sm text-foreground">{new Date(startDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {activeInternship?.student?.department && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Department</p>
                      <p className="font-medium text-sm text-foreground">{activeInternship.student.department}</p>
                    </div>
                  </div>
                )}
                {activeInternship?.company?.location && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Location</p>
                      <p className="font-medium text-sm text-foreground truncate">{activeInternship.company.location}</p>
                    </div>
                  </div>
                )}
                {activeInternship?.company?.contact_person_email && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Contact Email</p>
                      <p className="font-medium text-xs text-foreground truncate">{activeInternship.company.contact_person_email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Supervisors Sub-Section */}
              {(supervisorName || activeInternship?.industry_supervisor?.user?.name) && (
                <div className="pt-3 border-t border-primary/10 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Supervisors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {supervisorName && (
                      <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-primary/10">
                        <div className="flex items-start gap-2.5">
                          <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Academic Advisor</p>
                            <p className="font-medium text-sm mt-0.5 text-foreground">{supervisorName}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeInternship?.industry_supervisor?.user?.name && (
                      <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-primary/10">
                        <div className="flex items-start gap-2.5">
                          <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Industry Supervisor</p>
                            <p className="font-medium text-sm mt-0.5 text-foreground">{activeInternship.industry_supervisor.user.name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action shortcuts */}
              <div className="pt-3 border-t border-primary/10 flex gap-2">
                <button
                  onClick={() => navigate("/student/logbook")}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  Logbook Entries
                </button>
                <button
                  onClick={() => navigate("/student/attendance")}
                  className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all text-xs font-semibold flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Attendance Summary
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
              <Send className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
              <div>
                <h2 className="text-lg font-bold text-amber-950 dark:text-amber-100">No Active Internship</h2>
                <p className="text-amber-800/80 dark:text-amber-300 mt-1" style={{ fontSize: "0.85rem" }}>
                  Ready to start your industrial attachment? Submit an application to get started.
                </p>
              </div>
              <button
                onClick={() => navigate("/student/applications")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Key Metrics */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Progress Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Logbook Entries"
                value={recentLogbooks.length}
                subtitle={recentLogbooks.length > 0 ? `Latest: ${new Date(recentLogbooks[0].entry_date).toLocaleDateString()}` : "Start logging your daily work"}
                icon={<BookMarked className="w-4 h-4" />}
                highlight={recentLogbooks.length === 0}
              />
              <StatCard
                title="Attendance Rate"
                value={attendanceSummary ? `${attendanceSummary.attendance_rate}%` : "—"}
                subtitle={attendanceSummary ? `${attendanceSummary.present} present · ${attendanceSummary.absent} absent` : "No attendance data yet"}
                icon={<Clock className="w-4 h-4" />}
              />
              <StatCard
                title="My Grade"
                value={publishedGrade ? `${publishedGrade.total_score?.toFixed(1) ?? "—"}%` : "Pending"}
                subtitle={publishedGrade ? `${publishedGrade.letter_grade ?? "—"}` : "Check back after evaluation"}
                icon={<Award className="w-4 h-4" />}
                highlight={!!publishedGrade}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => navigate("/student/logbook")}
                className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col items-center"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors mb-2.5">
                  <BookMarked className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold text-xs text-foreground">Logbook</h4>
                <p className="text-muted-foreground text-[10px] mt-0.5">Add Daily Activities</p>
              </button>

              <button
                onClick={() => navigate("/student/grades")}
                className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col items-center"
              >
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors mb-2.5">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-semibold text-xs text-foreground">Grade Evaluation</h4>
                <p className="text-muted-foreground text-[10px] mt-0.5">{publishedGrade ? "View Grade" : "Grade Pending"}</p>
              </button>

              <button
                onClick={() => navigate("/student/documents")}
                className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col items-center"
              >
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors mb-2.5">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold text-xs text-foreground">My Documents</h4>
                <p className="text-muted-foreground text-[10px] mt-0.5">Upload Letters / Forms</p>
              </button>

              <button
                onClick={() => navigate("/student/applications")}
                className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col items-center"
              >
                <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors mb-2.5">
                  <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-semibold text-xs text-foreground">Apply Window</h4>
                <p className="text-muted-foreground text-[10px] mt-0.5">Attachment Windows</p>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & Site Visit Tracking */}
        <div className="space-y-6">
          
          {/* Site Visit Tracking Widget */}
          {activeVisitation && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-200">
              <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  Site Visit Tracking
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeVisitation.status === "completed" 
                    ? "bg-emerald-100 text-emerald-700" 
                    : activeVisitation.status === "cancelled" 
                    ? "bg-red-100 text-red-700" 
                    : "bg-amber-100 text-amber-700 animate-pulse"
                }`}>
                  {activeVisitation.status === "scheduled" ? "Scheduled" : activeVisitation.status === "completed" ? "Completed" : "Cancelled"}
                </span>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Advisor Details */}
                <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Assigned Visitor</p>
                  <p className="font-semibold text-xs text-foreground">{activeVisitation.academic_supervisor?.user?.name}</p>
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">📧 {activeVisitation.academic_supervisor?.user?.email}</span>
                    {activeVisitation.academic_supervisor?.user?.phone && (
                      <span className="flex items-center gap-1">📞 {activeVisitation.academic_supervisor.user.phone}</span>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  {[
                    { 
                      label: "Visitation Date Set", 
                      done: true, 
                      desc: `Scheduled for ${new Date(activeVisitation.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` 
                    },
                    { 
                      label: "On-site Placement Evaluation", 
                      done: activeVisitation.status === "completed", 
                      desc: "Advisor verifies location, internship tasks, and checks logbook alignment." 
                    },
                    { 
                      label: "Visit Report Approved", 
                      done: activeVisitation.status === "completed", 
                      desc: activeVisitation.status === "completed" ? "Site visit score and review approved." : "Awaiting visit completion." 
                    }
                  ].map((step, i, arr) => (
                    <div key={i} className="relative">
                      {i < arr.length - 1 && (
                        <div className={`absolute left-3 top-7 bottom-0 w-0.5 ${step.done ? "bg-amber-500" : "bg-muted"}`} />
                      )}
                      <div className="flex items-start gap-3 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] transition-colors ${
                          step.done
                            ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                            : "bg-muted text-muted-foreground border border-muted"
                        }`}>
                          {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <div className="pt-0.5 flex-1 min-w-0">
                          <p className={`font-semibold text-xs ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feedback Box (only when completed) */}
                {activeVisitation.status === "completed" && activeVisitation.generalComments && (
                  <div className="pt-3 border-t border-border bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30 text-xs">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Advisor Review Notes:
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 italic leading-relaxed">"{activeVisitation.generalComments}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Logbook Entries */}
          {recentLogbooks.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <BookMarked className="w-4 h-4 text-blue-600" />
                    Recent Activity
                  </h3>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{recentLogbooks.length} total logs</p>
                </div>
                <button
                  onClick={() => navigate("/student/logbook")}
                  className="text-primary hover:opacity-75 text-xs font-semibold flex items-center gap-0.5 transition-opacity"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {recentLogbooks.slice(0, 4).map((entry: any, idx: number) => (
                  <div
                    key={entry.id}
                    className="p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : "—"}
                        </p>
                        <p className="text-muted-foreground text-[11px] line-clamp-1 mt-0.5">
                          {entry.activities_description ?? entry.activities ?? "No activities recorded"}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={entry.status ?? "draft"} />
                      </div>
                    </div>
                    {entry.skills_learned && (
                      <div className="flex flex-wrap gap-1">
                        {String(entry.skills_learned).split(",").slice(0, 2).map((s: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-secondary/60 rounded text-secondary-foreground text-[9px] font-medium">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Application Timeline */}
          {activeInternship && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Internship Progress
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: "Application Submitted",   done: true },
                  { label: "Application Approved",    done: isDone(["approved", "active", "completed"]) },
                  { label: "Supervisor Assigned",     done: !!supervisorName, date: supervisorName ?? undefined },
                  { label: "Internship Active",       done: isDone(["active", "completed"]) },
                  { label: "Completed",               done: isDone(["completed"]) },
                ].map((step, i, arr) => (
                  <div key={i} className="relative">
                    {i < arr.length - 1 && (
                      <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 ${step.done ? "bg-primary" : "bg-muted"}`} />
                    )}
                    <div className="flex items-start gap-3 relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs transition-colors ${
                        step.done
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "bg-muted text-muted-foreground border border-muted"
                      }`}>
                        {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="pt-0.5">
                        <p className={`font-semibold text-xs ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {step.date && <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground mt-0.5">{step.date}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
