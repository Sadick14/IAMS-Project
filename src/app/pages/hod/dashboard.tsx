import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { StatCard } from "../../components/stat-card";
import { apiClient } from "../../lib/api-client";
import {
  AlertTriangle, GraduationCap, ClipboardCheck, BarChart3,
  Clock, ArrowRight, Download, Eye, Briefcase
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

  const [dashboard, setDashboard] = useState<any>(null);
  const [pendingGrades, setPendingGrades] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.getDashboard("hod"),
      apiClient.getGrades({ status: "calculated" }),
    ]).then(([dashRes, gradesRes]) => {
      if (cancelled) return;
      if (dashRes.success) setDashboard(dashRes.data);
      if (gradesRes.success) setPendingGrades(gradesRes.data);
    });
    return () => { cancelled = true; };
  }, []);

  const internshipCounts = dashboard?.internship_counts ?? { active: 0, completed: 0, pending: 0 };
  const gradeCounts = dashboard?.grade_counts ?? { calculated: 0, approved: 0, published: 0 };
  const activeTerm = dashboard?.active_term;

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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Attachments" value={internshipCounts.active}
          subtitle={`${internshipCounts.active + internshipCounts.completed + internshipCounts.pending} total this term`}
          icon={<Briefcase className="w-4 h-4" />} highlight />
        <StatCard title="Completed" value={internshipCounts.completed}
          subtitle="Finished attachments" icon={<GraduationCap className="w-4 h-4" />} />
        <StatCard title="Grades Pending" value={gradeCounts.calculated}
          subtitle="Awaiting your approval" icon={<ClipboardCheck className="w-4 h-4" />} />
        <StatCard title="Published Grades" value={gradeCounts.published}
          subtitle={`${gradeCounts.approved} approved`} icon={<BarChart3 className="w-4 h-4" />} />
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
          <h3 className="mb-4">Grade Pipeline</h3>
          {gradeData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground"><p style={{ fontSize: "0.85rem" }}>No grades compiled yet.</p></div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                  <Bar dataKey="count" fill="#0B5ED7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

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
