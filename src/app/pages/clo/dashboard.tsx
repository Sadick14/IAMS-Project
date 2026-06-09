import { useEffect, useState } from "react";
import { StatCard } from "../../components/stat-card";
import { StatusBadge } from "../../components/status-badge";
import { exportToCSV } from "../../lib/csv-export";
import { apiClient } from "../../lib/api-client";
import { getNameInitials } from "../../lib/validation";
import {
  Building2, FileText, GraduationCap, Clock, AlertTriangle, TrendingUp,
  ArrowRight, UserPlus, Zap, Download, Calendar, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";
import { SkeletonStatCards, SkeletonDashboard } from "../../components/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useNavigate } from "react-router";

// ── Field accessors ────────────────────────────────────────────────────────────
function getStudentName(app: any): string { return app.student?.user?.name ?? app.studentName ?? "—"; }
function getStudentNum(app: any): string  { return app.student?.student_id ?? app.studentId ?? "—"; }
function getCompanyName(app: any): string { return app.company?.name ?? app.companyName ?? "—"; }
function getDept(app: any): string        { return app.student?.department?.name ?? app.department ?? "—"; }
function getDateApplied(app: any): string {
  const raw = app.created_at ?? app.submitted_at ?? app.dateApplied ?? "";
  if (!raw || raw === "—") return "—";
  try { return new Date(raw).toLocaleDateString(); } catch { return raw; }
}

function toDateStr(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

// ── Component ──────────────────────────────────────────────────────────────────
export function CLODashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [appsRes, companiesRes, dashRes, notifRes] = await Promise.all([
        apiClient.getApplications(),
        apiClient.getCompanies(),
        apiClient.getDashboard("clo"),
        apiClient.getNotifications({ per_page: 5 }),
      ]);
      if (appsRes.success) setApplications(appsRes.data);
      if (companiesRes.success) setCompanies(companiesRes.data);
      if (dashRes.success) setDashData(dashRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await load();
      if (cancelled) return;
      // Auto-refresh every 30 seconds
      const interval = setInterval(load, 30000);
      return () => clearInterval(interval);
    };
    void init();
    return () => { cancelled = true; };
  }, []);

  // ── Derived values from API ──────────────────────────────────────────────────
  const activeTerm        = dashData?.active_term ?? null;
  const activeInternships = dashData?.internship_counts?.active ?? 0;
  const pendingInternships = dashData?.internship_counts?.pending ?? 0;
  const completedInternships = dashData?.internship_counts?.completed ?? 0;
  const terminatedInternships = dashData?.internship_counts?.terminated ?? 0;
  const totalStudents     = dashData?.system_counts?.total_students ?? 0;
  const totalCompanies    = dashData?.system_counts?.total_companies ?? 0;
  const pendingApps       = dashData?.system_counts?.pending_applications ?? 0;
  const pendingGrades     = dashData?.system_counts?.pending_grade_approvals ?? 0;
  const publishedGrades   = dashData?.system_counts?.published_grades ?? 0;
  const unreadNotifs      = dashData?.unread_notifications ?? 0;

  const pendingCompanies  = companies.filter((c) => (c.approval_status ?? c.status) === "pending").length;
  const needSupervisor    = applications.filter((a) => !a.academic_supervisor_id && a.status === "approved").length;

  const statusData = [
    { name: "Active",     value: activeInternships,     color: "#3B82F6" },
    { name: "Pending",    value: pendingInternships,     color: "#F59E0B" },
    { name: "Completed",  value: completedInternships,   color: "#8B5CF6" },
    { name: "Terminated", value: terminatedInternships,  color: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Department breakdown from applications
  const deptMap: Record<string, { active: number; pending: number; completed: number }> = {};
  for (const app of applications) {
    const d = getDept(app);
    if (!d || d === "—") continue;
    if (!deptMap[d]) deptMap[d] = { active: 0, pending: 0, completed: 0 };
    if (app.status === "active") deptMap[d].active++;
    else if (app.status === "submitted" || app.status === "under_review") deptMap[d].pending++;
    else if (app.status === "completed") deptMap[d].completed++;
  }
  const deptData = Object.entries(deptMap)
    .map(([name, counts]) => ({ name, ...counts }))
    .filter((d) => d.active + d.pending + d.completed > 0);

  if (loading) return <SkeletonDashboard statCount={5} />;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Central Liaison Dashboard</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading ? "Loading…" : activeTerm ? `Active Term: ${activeTerm.name}` : "No active term"} · System-wide overview
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={refreshing || loading}
            className="px-3 py-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {!refreshing && <span className="hidden sm:inline">Refresh</span>}
          </button>
          <button
            onClick={() => navigate("/clo/terms")}
            className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">New Term</span>
          </button>
          <button
            onClick={() => exportToCSV(
              applications.map((a) => ({
                Student: getStudentName(a), ID: getStudentNum(a),
                Company: getCompanyName(a), Department: getDept(a),
                Status: a.status, Date: getDateApplied(a),
              })),
              "clo_applications_export"
            )}
            className="px-3 md:px-4 py-2 bg-card border border-border rounded-xl hover:shadow-sm transition-all flex items-center gap-2 text-foreground"
            style={{ fontSize: "0.85rem" }}
          >
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Active Term Card ─────────────────────────────────────────────────── */}
      {activeTerm && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{activeTerm.name}</p>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-medium capitalize">
                {activeTerm.status}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs capitalize">
                {activeTerm.type === "short_term" ? "Vacation" : activeTerm.type === "regular" ? "Semestrial" : activeTerm.type}
              </span>
            </div>
            {activeTerm.description && (
              <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.78rem" }}>{activeTerm.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              ["Start", toDateStr(activeTerm.start_date)],
              ["End", toDateStr(activeTerm.end_date)],
              ["Deadline", toDateStr(activeTerm.application_deadline)],
            ].map(([label, val]) => (
              <div key={label} className="text-right">
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{label}</p>
                <p style={{ fontSize: "0.85rem", fontWeight: 500 }}>{val}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/clo/terms")} className="text-primary hover:underline flex items-center gap-1 shrink-0" style={{ fontSize: "0.8rem" }}>
            Manage <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Total Students"    value={totalStudents}      subtitle="Registered"         icon={<GraduationCap className="w-4 h-4" />} highlight />
        <StatCard title="Total Companies"   value={totalCompanies}     subtitle={`${pendingCompanies} pending`} icon={<Building2 className="w-4 h-4" />} />
        <StatCard title="Active Internships" value={activeInternships}  subtitle="Placed at companies" icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard title="Pending Applications" value={pendingApps}     subtitle="Awaiting review"     icon={<Clock className="w-4 h-4" />} />
        <StatCard title="Pending Grades"    value={pendingGrades}      subtitle={`${publishedGrades} published`} icon={<TrendingUp className="w-4 h-4" />} />
      </div>

      {/* ── Alert Banners ────────────────────────────────────────────────────── */}
      {(pendingApps > 0 || needSupervisor > 0 || pendingCompanies > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {pendingApps > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "0.85rem" }} className="text-blue-800 dark:text-blue-200 font-medium">{pendingApps} application{pendingApps !== 1 ? "s" : ""} pending review</p>
              </div>
              <button onClick={() => navigate("/clo/applications")} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0" style={{ fontSize: "0.78rem" }}>
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
          {needSupervisor > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "0.85rem" }} className="text-amber-800 dark:text-amber-200 font-medium">{needSupervisor} student{needSupervisor !== 1 ? "s" : ""} need supervisor</p>
              </div>
              <button onClick={() => navigate("/clo/applications")} className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0" style={{ fontSize: "0.78rem" }}>
                Assign <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
          {pendingCompanies > 0 && (
            <div className="bg-violet-50 dark:bg-violet-500/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "0.85rem" }} className="text-violet-800 dark:text-violet-200 font-medium">{pendingCompanies} compan{pendingCompanies !== 1 ? "ies" : "y"} awaiting approval</p>
              </div>
              <button onClick={() => navigate("/clo/companies")} className="px-2.5 py-1.5 bg-violet-600 text-white rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0" style={{ fontSize: "0.78rem" }}>
                Approve <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Review Applications", count: pendingApps, icon: FileText, path: "/clo/applications", color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
          { label: "Approve Companies",   count: pendingCompanies, icon: Building2, path: "/clo/companies", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Manage Grades",       count: pendingGrades, icon: TrendingUp, path: "/clo/grades", color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
          { label: "Manage Users",        count: null, icon: Zap, path: "/clo/users", color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="bg-card rounded-2xl p-4 hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-all duration-200 text-left group"
          >
            <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
              <action.icon className="w-4 h-4" />
            </div>
            <p style={{ fontSize: "0.85rem" }} className="group-hover:text-primary transition-colors font-medium">{action.label}</p>
            {action.count !== null && (
              <p style={{ fontSize: "0.72rem" }} className="text-muted-foreground mt-0.5">{action.count} pending</p>
            )}
          </button>
        ))}
      </div>

      {/* ── Internship Summary + Status Chart ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Internship counts breakdown */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-5">
          <h3 className="mb-4">Internship Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Active",     value: activeInternships,    color: "border-blue-200 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" },
              { label: "Pending",    value: pendingInternships,   color: "border-amber-200 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" },
              { label: "Completed",  value: completedInternships, color: "border-violet-200 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300" },
              { label: "Terminated", value: terminatedInternships, color: "border-red-200 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                <p style={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "0.78rem" }} className="mt-1 opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Department breakdown if we have app data */}
          {deptData.length > 0 && (
            <div className="mt-5">
              <p className="text-muted-foreground uppercase tracking-widest mb-3" style={{ fontSize: "0.62rem", fontWeight: 600 }}>By Department</p>
              <div className="h-40 flex items-end gap-3 px-1">
                {(() => {
                  const max = Math.max(1, ...deptData.flatMap((d) => [d.active, d.pending, d.completed]));
                  return deptData.map((d) => (
                    <div key={d.name} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                        <div className="w-1/3 bg-[#3B82F6] rounded-t" style={{ height: `${(d.active / max) * 100}%`, minHeight: d.active > 0 ? 4 : 0 }} />
                        <div className="w-1/3 bg-[#F59E0B] rounded-t" style={{ height: `${(d.pending / max) * 100}%`, minHeight: d.pending > 0 ? 4 : 0 }} />
                        <div className="w-1/3 bg-[#8B5CF6] rounded-t" style={{ height: `${(d.completed / max) * 100}%`, minHeight: d.completed > 0 ? 4 : 0 }} />
                      </div>
                      <span className="text-muted-foreground truncate w-full text-center" style={{ fontSize: "0.62rem" }} title={d.name}>{(d.name || "—").split(" ")[0]}</span>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex items-center gap-4 mt-2" style={{ fontSize: "0.72rem" }}>
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6] inline-block" />Active</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B] inline-block" />Pending</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6] inline-block" />Completed</span>
              </div>
            </div>
          )}

          {deptData.length === 0 && !loading && (
            <div className="mt-5 text-center text-muted-foreground py-8" style={{ fontSize: "0.85rem" }}>
              No internship data yet for the current term.
            </div>
          )}
        </div>

        {/* Status Donut */}
        <div className="bg-card rounded-2xl p-5">
          <h3 className="mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" isAnimationActive={false}>
                    {statusData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <XCircle className="w-8 h-8 opacity-30" />
              <p style={{ fontSize: "0.82rem" }}>No internship data yet</p>
            </div>
          )}

          {/* Grade summary */}
          {(pendingGrades > 0 || publishedGrades > 0) && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>Grades</p>
              <div className="flex justify-between" style={{ fontSize: "0.82rem" }}>
                <span className="text-muted-foreground">Pending approval</span>
                <span className="font-medium">{pendingGrades}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: "0.82rem" }}>
                <span className="text-muted-foreground">Published</span>
                <span className="font-medium text-emerald-600">{publishedGrades}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Applications + Notifications ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Applications table */}
        <div className="lg:col-span-2 bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3>Recent Applications</h3>
            <button onClick={() => navigate("/clo/applications")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
              View all
            </button>
          </div>
          {applications.length === 0 && !loading ? (
            <div className="py-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
              No applications yet for this term.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Student", "Company", "Dept", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 6).map((app) => (
                    <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                        <div>
                          <p className="font-medium">{getStudentName(app)}</p>
                          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{getStudentNum(app)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{getCompanyName(app)}</td>
                      <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.82rem" }}>{getDept(app)}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.78rem" }}>{getDateApplied(app)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3>Notifications</h3>
              {unreadNotifs > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground" style={{ fontSize: "0.65rem", fontWeight: 600 }}>{unreadNotifs}</span>
              )}
            </div>
            <button onClick={() => navigate("/clo/communications")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-muted-foreground text-center" style={{ fontSize: "0.82rem" }}>No notifications.</p>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-secondary/30" : ""}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "0.85rem" }} className="font-medium truncate">{n.title}</p>
                  <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground line-clamp-2">{n.message ?? n.body}</p>
                </div>
                <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.7rem" }}>
                  {n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
