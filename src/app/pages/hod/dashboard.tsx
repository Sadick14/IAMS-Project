import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { StatCard } from "../../components/stat-card";
import { apiClient } from "../../lib/api-client";
import { SkeletonDashboard } from "../../components/skeleton";
import {
  AlertTriangle, GraduationCap, ClipboardCheck, BarChart3,
  Clock, ArrowRight, Download, Eye, Briefcase, TrendingUp, Users, Award, Building2
} from "lucide-react";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getNameInitials } from "../../lib/validation";

function getStudentName(g: any) { return g.internship?.student?.user?.name ?? g.student?.user?.name ?? "—"; }
function getStudentNum(g: any)  { return g.internship?.student?.student_id ?? g.student?.student_id ?? "—"; }

export function HODDashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const dept = user?.department || "";
  const deptId = user?.department_id;

  const [dashboard, setDashboard] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pendingGrades, setPendingGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const requests: Promise<any>[] = [
      apiClient.getDashboard("hod"),
      apiClient.getGrades({ status: "calculated" }),
    ];
    if (deptId) {
      requests.push(apiClient.getDepartmentAnalytics(String(deptId)));
    }
    Promise.all(requests).then(([dashRes, gradesRes, analyticsRes]) => {
      if (cancelled) return;
      if (dashRes.success) setDashboard(dashRes.data);
      if (gradesRes.success) setPendingGrades(gradesRes.data);
      if (analyticsRes && analyticsRes.success) setAnalytics(analyticsRes.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [deptId]);

  const internshipCounts = dashboard?.internship_counts ?? { active: 0, completed: 0, pending: 0 };
  const gradeCounts = dashboard?.grade_counts ?? { calculated: 0, approved: 0, published: 0 };
  const activeTerm = dashboard?.active_term;

  // Analytics data
  const students = analytics?.student_counts ?? { total: 0, active: 0, inactive: 0 };
  const apps = analytics?.application_metrics ?? { total: 0, approved: 0, pending: 0, rejected: 0, approval_rate: 0 };
  const internships = analytics?.internship_statistics ?? { total: 0, active: 0, completed: 0, terminated: 0, completion_rate: 0 };
  const performance = analytics?.performance_data ?? { published_grades: 0, average_score: null, grade_distribution: {} };
  const supervisors = analytics?.supervisor_stats ?? { total_supervisors: 0, avg_load: 0, max_load: 0 };
  const companies = analytics?.company_partnerships ?? 0;

  const statusData = [
    { name: "Active",    value: internshipCounts.active,    color: "#0B5ED7" },
    { name: "Completed", value: internshipCounts.completed, color: "#10B981" },
    { name: "Pending",   value: internshipCounts.pending,   color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  const gradeData = [
    { stage: "Calculated", count: gradeCounts.calculated },
    { stage: "Approved",   count: gradeCounts.approved },
    { stage: "Published",  count: gradeCounts.published },
  ].filter((d) => d.count > 0);

  const gradeDistData = Object.entries(performance.grade_distribution || {})
    .map(([grade, count]: [string, any]) => ({ grade, count }))
    .sort((a, b) => {
      const order = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];
      return order.indexOf(a.grade) - order.indexOf(b.grade);
    });

  const getGradeColor = (grade: string) => {
    if (["A", "A+", "A-"].includes(grade)) return "#10B981";
    if (["B+", "B", "B-"].includes(grade)) return "#0B5ED7";
    if (["C+", "C", "C-"].includes(grade)) return "#F59E0B";
    return "#EF4444";
  };

  if (loading) return <SkeletonDashboard statCount={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>HOD Dashboard</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Department of {dept}{activeTerm ? ` · ${activeTerm.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/hod/approvals")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <ClipboardCheck className="w-4 h-4" /> Approvals
            {gradeCounts.calculated > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-md" style={{ fontSize: "0.7rem" }}>{gradeCounts.calculated}</span>
            )}
          </button>
          <button
            onClick={() => navigate("/hod/reports")}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <Download className="w-4 h-4" /> Reports
          </button>
        </div>
      </div>

      {/* Expanded Stat Cards with Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard title="Active Attachments" value={internshipCounts.active}
          subtitle={`${internships.completion_rate || 0}% completion`}
          icon={<Briefcase className="w-4 h-4" />} highlight />
        <StatCard title="Total Students" value={students.total}
          subtitle={`${students.active} active`} icon={<Users className="w-4 h-4" />} />
        <StatCard title="Application Rate" value={`${apps.approval_rate || 0}%`}
          subtitle={`${apps.approved}/${apps.total} approved`} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard title="Avg Score" value={performance.average_score ? `${Number(performance.average_score).toFixed(1)}%` : "—"}
          subtitle={`${performance.published_grades} graded`} icon={<Award className="w-4 h-4" />} />
        <StatCard title="Company Partners" value={companies}
          subtitle="Active partnerships" icon={<Building2 className="w-4 h-4" />} />
        <StatCard title="Grades Pending" value={gradeCounts.calculated}
          subtitle="Awaiting approval" icon={<ClipboardCheck className="w-4 h-4" />} />
      </div>

      {/* Alert */}
      {gradeCounts.calculated > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-amber-800" style={{ fontSize: "0.85rem" }}>
              {gradeCounts.calculated} grade{gradeCounts.calculated > 1 ? "s" : ""} awaiting your approval
            </p>
          </div>
          <button onClick={() => navigate("/hod/approvals")}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-1 shrink-0"
            style={{ fontSize: "0.8rem" }}>
            Review <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="mb-4">Internship Status Distribution</h3>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground"><p style={{ fontSize: "0.85rem" }}>No internship data yet.</p></div>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                      {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="mb-4">Grade Pipeline & Distribution</h3>
          {gradeData.length === 0 && gradeDistData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground"><p style={{ fontSize: "0.85rem" }}>No grades compiled yet.</p></div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistData.length > 0 ? gradeDistData : gradeData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey={gradeDistData.length > 0 ? "grade" : "stage"} axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                  <Bar dataKey="count" fill="#0B5ED7" radius={[4, 4, 0, 0]}>
                    {gradeDistData.length > 0 && gradeDistData.map((entry: any) => (
                      <Cell key={entry.grade} fill={getGradeColor(entry.grade)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Application & Supervisor Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application Metrics */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="mb-4">Application Metrics</h3>
            <div className="space-y-3">
              {[
                { label: "Total Applications", value: apps.total },
                { label: "Approved", value: apps.approved, color: "bg-emerald-50 text-emerald-700" },
                { label: "Pending", value: apps.pending, color: "bg-amber-50 text-amber-700" },
                { label: "Rejected", value: apps.rejected, color: "bg-red-50 text-red-700" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span style={{ fontSize: "0.85rem" }}>{item.label}</span>
                  <span className={`px-3 py-1 rounded-lg font-medium ${item.color || ""}`} style={{ fontSize: "0.85rem" }}>
                    {item.value || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Stats */}
          {supervisors.total_supervisors > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="mb-4">Supervisor Capacity</h3>
              <div className="space-y-3">
                {[
                  { label: "Total Supervisors", value: supervisors.total_supervisors },
                  { label: "Avg Load", value: supervisors.avg_load },
                  { label: "Max Load", value: supervisors.max_load },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span style={{ fontSize: "0.85rem" }}>{item.label}</span>
                    <span className="font-medium" style={{ fontSize: "0.85rem" }}>{item.value || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Engagement */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="mb-4">Student Engagement</h3>
            <div className="space-y-3">
              {[
                { label: "Active Students", value: students.active, color: "bg-emerald-50 text-emerald-700" },
                { label: "Inactive", value: students.inactive, color: "bg-gray-50 text-gray-700" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span style={{ fontSize: "0.85rem" }}>{item.label}</span>
                  <span className={`px-3 py-1 rounded-lg font-medium ${item.color}`} style={{ fontSize: "0.85rem" }}>
                    {item.value || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Grades Quick View */}
      {pendingGrades.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /> Grades Pending Your Approval</h3>
            <button onClick={() => navigate("/hod/approvals")} className="text-primary hover:underline flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
              Review all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {pendingGrades.slice(0, 6).map((g: any) => (
              <div key={g.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700" style={{ fontSize: "0.75rem" }}>
                    {getNameInitials(getStudentName(g))}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.85rem" }}>{getStudentName(g)}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{getStudentNum(g)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-secondary rounded-lg" style={{ fontSize: "0.9rem" }}>
                    {g.total_score !== null && g.total_score !== undefined ? `${Number(g.total_score).toFixed(1)}%` : "—"}
                    {g.letter_grade ? ` (${g.letter_grade})` : ""}
                  </span>
                  <button onClick={() => navigate("/hod/approvals")}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5"
                    style={{ fontSize: "0.8rem" }}>
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

