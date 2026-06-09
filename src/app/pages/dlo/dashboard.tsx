import { useState, useEffect } from "react";
import { StatCard } from "../../components/stat-card";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { SkeletonDashboard } from "../../components/skeleton";
import {
  Building2, FileText, GraduationCap, Clock, AlertTriangle, UserPlus,
  ArrowRight, TrendingUp, CheckCircle2, BarChart3, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend, CartesianGrid
} from "recharts";
import { useNavigate } from "react-router";

// Helpers to read nested backend fields
function getStudentName(app: any): string { return app.student?.user?.name ?? app.studentName ?? "—"; }
function getStudentNum(app: any): string  { return app.student?.student_id ?? app.studentId ?? "—"; }
function getCompanyName(app: any): string { return app.company?.name ?? app.companyName ?? "—"; }

export function DLODashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const dept = user?.department || "";

  const [applications, setApplications] = useState<any[]>([]);
  const [dashboardCounts, setDashboardCounts] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [appsRes, dashRes, notifRes, assignRes] = await Promise.all([
        apiClient.getApplications({ department: dept }),
        apiClient.getDashboard("dlo"),
        apiClient.getNotifications({ per_page: 4 }),
        apiClient.getSupervisorAssignmentsPending({ per_page: 6, department: dept }),
      ]);
      if (appsRes.success)    setApplications(appsRes.data);
      if (dashRes.success)    setDashboardCounts(dashRes.data);
      if (notifRes.success)   setNotifications(notifRes.data);
      if (assignRes.success)  setPendingAssignments(assignRes.data);
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
  }, [dept]);

  // Counts from backend dashboard endpoint (pre-computed, dept-scoped)
  const activeStudents    = dashboardCounts?.internship_counts?.active    ?? 0;
  const completedStudents = dashboardCounts?.internship_counts?.completed ?? 0;
  const pendingApps       = dashboardCounts?.pending_applications         ?? 0;
  const needSupervisor    = dashboardCounts?.unassigned_internships       ?? 0;
  const pendingGrades     = dashboardCounts?.pending_grade_approvals      ?? 0;
  const pendingCompanies  = applications.filter((c: any) => (c.approval_status ?? c.status) === "pending").length;

  const totalInternships = activeStudents + completedStudents + (dashboardCounts?.internship_counts?.pending ?? 0);
  const placementRate = totalInternships > 0
    ? Math.round(((activeStudents + completedStudents) / totalInternships) * 100)
    : 0;

  // Charts — built from real application statuses (backend values)
  const funnelData = [
    { stage: "Applied",   count: applications.length },
    { stage: "Approved",  count: applications.filter((a) => ["approved"].includes(a.status)).length },
    { stage: "Active",    count: activeStudents },
    { stage: "Completed", count: completedStudents },
  ];

  const statusData = [
    { id: "active",    name: "Active",    value: activeStudents,    color: "#3B82F6" },
    { id: "pending",   name: "Pending",   value: pendingApps,       color: "#F59E0B" },
    { id: "completed", name: "Completed", value: completedStudents, color: "#8B5CF6" },
    { id: "approved",  name: "Approved",  value: applications.filter((a) => a.status === "approved").length, color: "#10B981" },
  ].filter((d) => d.value > 0);

  if (loading) return <SkeletonDashboard statCount={4} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Department Dashboard</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {dept ? `${dept} · ` : ""}Departmental Liaison Overview
          </p>
        </div>
        <div className="flex gap-2 items-center">
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
            onClick={() => navigate("/dlo/applications")}
            className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Review Applications</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Dept Applications" value={applications.length} subtitle="Current term" icon={<FileText className="w-4 h-4" />} highlight />
        <StatCard title="Active Students"   value={activeStudents}      subtitle="At companies" icon={<GraduationCap className="w-4 h-4" />} />
        <StatCard title="Pending Review"    value={pendingApps}         subtitle="Awaiting approval" icon={<Clock className="w-4 h-4" />} />
        <StatCard title="Placement Rate"    value={`${placementRate}%`} subtitle="Active + completed" icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard title="Pending Grades"    value={pendingGrades}       subtitle="Need approval" icon={<BarChart3 className="w-4 h-4" />} />
      </div>

      {/* Alert Banners */}
      {needSupervisor > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: "0.85rem" }} className="text-amber-800">
              {needSupervisor} internship(s) have no academic supervisor assigned
            </p>
            <p style={{ fontSize: "0.75rem" }} className="text-amber-600">Assign in the Supervisors page</p>
          </div>
          <button
            onClick={() => navigate("/dlo/supervisors")}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0"
            style={{ fontSize: "0.8rem" }}
          >
            Assign <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Placement Funnel */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h3 className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" /> Placement Funnel
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#0B5ED7" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="mb-4">Status Distribution</h3>
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name" isAnimationActive={false}>
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${entry.id}-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Review Applications", count: pendingApps,   icon: FileText,    path: "/dlo/applications", color: "text-blue-600 bg-blue-50" },
          { label: "Approve Companies",   count: pendingCompanies, icon: Building2, path: "/dlo/companies",    color: "text-emerald-600 bg-emerald-50" },
          { label: "Assign Supervisors",  count: needSupervisor, icon: UserPlus,   path: "/dlo/supervisors",  color: "text-violet-600 bg-violet-50" },
          { label: "View Reports",        count: null,           icon: TrendingUp,  path: "/dlo/reports",      color: "text-orange-600 bg-orange-50" },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow text-left group"
          >
            <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
              <action.icon className="w-4.5 h-4.5" />
            </div>
            <p style={{ fontSize: "0.85rem" }} className="group-hover:text-primary transition-colors">{action.label}</p>
            {action.count !== null && action.count > 0 && (
              <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground mt-0.5">{action.count} pending</p>
            )}
          </button>
        ))}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Applications */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3>Recent Applications</h3>
            <button onClick={() => navigate("/dlo/applications")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            {applications.length === 0 ? (
              <p className="px-4 py-6 text-muted-foreground text-center" style={{ fontSize: "0.85rem" }}>No applications yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Student</th>
                    <th className="text-left px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Company</th>
                    <th className="text-left px-4 py-2.5" style={{ fontSize: "0.75rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 5).map((app) => (
                    <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                        <div>
                          <p>{getStudentName(app)}</p>
                          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{getStudentNum(app)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{getCompanyName(app)}</td>
                      <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Supervisor Assignments */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3>Awaiting Supervisor Assignment</h3>
            <button onClick={() => navigate("/dlo/supervisors")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
              Assign all
            </button>
          </div>
          <div className="p-3 space-y-2">
            {pendingAssignments.length === 0 ? (
              <div className="flex items-center gap-3 p-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground">All internships have supervisors assigned.</p>
              </div>
            ) : (
              pendingAssignments.map((i: any, idx: number) => (
                <div key={i.id ?? idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "0.85rem" }} className="truncate">
                      {i.student?.user?.name ?? i.studentName ?? "—"}
                    </p>
                    <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground truncate">
                      {i.company?.name ?? i.companyName ?? "—"}
                    </p>
                  </div>
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3>Recent Notifications</h3>
          <button onClick={() => navigate("/dlo/communications")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
            View all
          </button>
        </div>
        <div className="divide-y divide-border">
          {notifications.length === 0 && (
            <p className="px-4 py-4 text-muted-foreground" style={{ fontSize: "0.8rem" }}>No notifications.</p>
          )}
          {notifications.map((n) => (
            <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.is_read ? "bg-secondary/30" : ""}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
              <div className="flex-1">
                <p style={{ fontSize: "0.85rem" }}>{n.title}</p>
                <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{n.message ?? n.body}</p>
              </div>
              <span className="ml-auto text-muted-foreground shrink-0" style={{ fontSize: "0.7rem" }}>
                {new Date(n.created_at ?? n.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
