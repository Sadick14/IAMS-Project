import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import { Download, FileText, TrendingUp, BarChart3, Users, GraduationCap, Building2, RefreshCw } from "lucide-react";
import { exportToCSV } from "../../lib/csv-export";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";

interface Props { viewRole: ExtendedRole; }
type ReportTab = "overview" | "placement" | "grades" | "companies";

const STATUS_COLORS: Record<string, string> = {
  active: "#3B82F6", completed: "#8B5CF6", pending: "#F59E0B",
  terminated: "#EF4444", approved: "#10B981", submitted: "#6366F1",
};

export function ReportsPage({ viewRole }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, progRes, deptRes, perfRes, coRes, supRes] = await Promise.all([
        apiClient.getAnalyticsOverview(),
        apiClient.getInternshipProgress(),
        apiClient.getDepartmentStatistics(),
        apiClient.getStudentPerformance(),
        apiClient.getCompanies({ per_page: 200 }),
        // Graceful: CLO/DLO only — HOD will get 403 and supRes.success=false
        apiClient.getAvailableSupervisors().catch(() => ({ success: false, data: [] })),
      ]);
      if (ovRes.success)   setOverview(ovRes.data);
      if (progRes.success) setProgress(progRes.data);
      if (deptRes.success) setDeptStats((deptRes.data as any)?.departments ?? []);
      if (perfRes.success) setPerformance(perfRes.data);
      if (coRes.success)   setCompanies(coRes.data);
      if ((supRes as any).success) setSupervisors((supRes as any).data ?? []);
    } catch (e) {
      console.error("Reports load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sys = overview?.system_overview ?? {};
  const deptBreakdown: any[] = overview?.department_breakdown ?? [];

  // Charts
  const statusData = progress?.status_counts
    ? Object.entries(progress.status_counts as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: STATUS_COLORS[k] ?? "#94A3B8" }))
    : [];

  const placementData = deptStats
    .filter((d) => d.total_students > 0)
    .map((d) => ({
      name: d.department_code ?? d.department_name?.split(" ")[0],
      rate: d.total_students > 0
        ? Math.round(((d.internship_counts?.active ?? 0) + (d.internship_counts?.completed ?? 0)) / d.total_students * 100)
        : 0,
      total: d.total_students,
      placed: (d.internship_counts?.active ?? 0) + (d.internship_counts?.completed ?? 0),
    }));

  const gradeData = performance?.letter_distribution
    ? Object.entries(performance.letter_distribution as Record<string, number>)
        .map(([g, c]) => ({ grade: g, count: c }))
        .sort((a, b) => b.count - a.count)
    : [];

  const companyByIndustry = Object.entries(
    companies
      .filter((c) => c.approval_status === "approved")
      .reduce((acc: Record<string, number>, c) => {
        const ind = c.industry || "Other";
        acc[ind] = (acc[ind] || 0) + 1;
        return acc;
      }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const companyStatus = [
    { name: "Approved", value: companies.filter((c) => c.approval_status === "approved").length, color: "#10B981" },
    { name: "Pending",  value: companies.filter((c) => c.approval_status === "pending").length,  color: "#F59E0B" },
    { name: "Rejected", value: companies.filter((c) => c.approval_status === "rejected").length, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  const supervisorWorkload = supervisors
    .map((s: any) => ({ name: s.user?.name?.split(" ").pop() ?? "—", students: s.current_students ?? 0, max: s.max_students ?? 0 }))
    .filter((s) => s.max > 0)
    .sort((a, b) => b.students - a.students);

  const tabs: { key: ReportTab; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview",   label: "Overview",    icon: BarChart3 },
    { key: "placement",  label: "Placements",  icon: GraduationCap },
    { key: "grades",     label: "Grades",      icon: FileText },
    { key: "companies",  label: "Companies",   icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {viewRole === "clo" ? "Institution-wide analytics" : "Department analytics"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="px-3 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2 disabled:opacity-50" style={{ fontSize: "0.85rem" }}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => exportToCSV(deptStats.map((d) => ({
              Department: d.department_name, Code: d.department_code,
              Students: d.total_students, "Active Internships": d.internship_counts?.active ?? 0,
              "Completed": d.internship_counts?.completed ?? 0, "Avg Score": d.grade_summary?.average_score ?? "—",
            })), "department_report")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 h-20 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Students",    value: sys.total_students    ?? 0, icon: Users,         color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
            { label: "Active Internships",value: sys.active_internships ?? 0, icon: GraduationCap, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
            { label: "Completed",         value: sys.completed_internships ?? 0, icon: TrendingUp, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
            { label: "Companies",         value: sys.total_companies   ?? 0, icon: Building2,     color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
            { label: "Applications",      value: sys.total_applications ?? 0, icon: FileText,     color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{s.label}</p>
                <p style={{ fontSize: "1.15rem", fontWeight: 600 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            style={{ fontSize: "0.85rem" }}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Distribution */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Internship Status Distribution</h3>
              <div className="h-56">
                {statusData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name">
                        {statusData.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Dept applications */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Internships by Department</h3>
              <div className="h-56">
                {deptBreakdown.filter((d) => d.internships > 0).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBreakdown.filter((d) => d.internships > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="internships" fill="#0B5ED7" radius={[6, 6, 0, 0]} name="Internships" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Supervisor Workload */}
          {supervisorWorkload.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Supervisor Workload</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supervisorWorkload} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} domain={[0, 'dataMax']} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number, _: string, p: any) => [`${v} / ${p.payload.max}`, "Students"]} />
                    <Bar dataKey="students" fill="#8B5CF6" radius={[0, 6, 6, 0]} name="Assigned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Placement Tab */}
      {activeTab === "placement" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="mb-4">Placement Rate by Department</h3>
            <div className="h-64">
              {placementData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={placementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Rate"]} />
                    <Bar dataKey="rate" fill="#0B5ED7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border"><h3>Department Placement Details</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Department", "Students", "Placed", "Rate", "Progress"].map((h) => (
                      <th key={h} className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptStats.filter((d) => d.total_students > 0).map((d) => {
                    const placed = (d.internship_counts?.active ?? 0) + (d.internship_counts?.completed ?? 0);
                    const rate = d.total_students > 0 ? Math.round(placed / d.total_students * 100) : 0;
                    return (
                      <tr key={d.department_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{d.department_name}</td>
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{d.total_students}</td>
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{placed}</td>
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{rate}%</td>
                        <td className="px-4 py-3 w-40">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${rate >= 75 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Grades Tab */}
      {activeTab === "grades" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Grade Distribution</h3>
              <div className="h-56">
                {gradeData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No grades recorded yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Grade Summary</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3 text-center">
                    <p style={{ fontSize: "1.5rem" }} className="text-violet-700 dark:text-violet-400 font-bold">
                      {performance?.average_gpa?.toFixed(2) ?? "—"}
                    </p>
                    <p className="text-violet-600 dark:text-violet-400" style={{ fontSize: "0.7rem" }}>Average GPA</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center">
                    <p style={{ fontSize: "1.5rem" }} className="text-blue-700 dark:text-blue-400 font-bold">
                      {performance?.total_graded ?? 0}
                    </p>
                    <p className="text-blue-600 dark:text-blue-400" style={{ fontSize: "0.7rem" }}>Graded Students</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Pass Rate",     value: `${performance?.pass_rate ?? 0}%`,   color: "bg-emerald-500" },
                    { label: "Average Score", value: `${performance?.average_score?.toFixed(1) ?? "—"}`, color: "bg-blue-500" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: "0.85rem" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {(performance?.top_performers ?? []).length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2" style={{ fontSize: "0.7rem" }}>TOP PERFORMERS</p>
                    {performance.top_performers.slice(0, 3).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <div>
                          <p style={{ fontSize: "0.82rem" }}>{p.student}</p>
                          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{p.department}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold" style={{ fontSize: "0.75rem" }}>
                          {p.letter_grade} · {p.total_score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Approved Companies by Industry</h3>
              <div className="h-56">
                {companyByIndustry.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={companyByIndustry} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#14B8A6" radius={[0, 6, 6, 0]} name="Companies" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="mb-4">Company Status Breakdown</h3>
              <div className="h-56">
                {companyStatus.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No companies yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={companyStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name">
                        {companyStatus.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Companies */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border"><h3>Approved Companies</h3></div>
            <div className="divide-y divide-border">
              {companies.filter((c) => c.approval_status === "approved").slice(0, 8).map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.85rem" }}>{c.name}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{c.industry || "—"} · {c.city || c.region || "—"}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-full" style={{ fontSize: "0.75rem" }}>
                    Max {c.max_interns ?? "—"} interns
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Downloadable Reports */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3>Export Reports</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: "Department Statistics",  action: () => exportToCSV(deptStats.map((d) => ({ Dept: d.department_name, Students: d.total_students, Active: d.internship_counts?.active, Completed: d.internship_counts?.completed, "Avg Score": d.grade_summary?.average_score })), "dept_stats") },
            { name: "Company List",           action: () => exportToCSV(companies.map((c) => ({ Name: c.name, Industry: c.industry, Status: c.approval_status, City: c.city })), "companies") },
            { name: "Top Performers",         action: () => performance?.top_performers ? exportToCSV(performance.top_performers, "top_performers") : toast.error("No grade data yet.") },
          ].map((r) => (
            <div key={r.name} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <p style={{ fontSize: "0.85rem" }}>{r.name}</p>
              </div>
              <button onClick={r.action}
                className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1.5 text-muted-foreground shrink-0"
                style={{ fontSize: "0.8rem" }}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
