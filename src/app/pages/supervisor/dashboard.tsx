import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { StatusBadge } from "../../components/status-badge";
import { StatCard } from "../../components/stat-card";
import { AssessmentChecklistCard } from "../../components/supervisor/assessment-checklist-card";
import { apiClient } from "../../lib/api-client";
import { SkeletonDashboard } from "../../components/skeleton";
import {
  GraduationCap, BookMarked, ClipboardCheck, AlertTriangle,
  MapPin, TrendingUp, Calendar, CheckCircle2, Shield
} from "lucide-react";
import { useNavigate } from "react-router";

function getStudentName(i: any) { return i.student?.user?.name ?? "—"; }
function getStudentNum(i: any)  { return i.student?.student_id ?? "—"; }
function getCompanyName(i: any) { return i.company?.name ?? "—"; }
function getDept(i: any)        { return i.student?.department?.name ?? "—"; }

export function SupervisorDashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<any>(null);
  const [pendingLogs, setPendingLogs] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [dashRes, logsRes, approvalsRes] = await Promise.all([
        apiClient.getDashboard("industry-supervisor"),
        apiClient.getLogbookEntries({ status: "submitted", per_page: 10 }),
        apiClient.getPendingSupervisorInvitations(),
      ]);
      if (cancelled) return;
      if (dashRes.success) {
        setDashboard(dashRes.data);
        // Filter logs to only include those from assigned students
        if (logsRes.success && Array.isArray(logsRes.data)) {
          const assignedIds = new Set(
            (dashRes.data?.assigned_internships ?? [])
              .filter((i: any) => (i.industry_supervisor?.user?.id ?? i.industry_supervisor?.id ?? i.industry_supervisor) === user?.id)
              .map((i: any) => i.id)
          );
          const filtered = logsRes.data.filter((log: any) => assignedIds.has(log.internship_id));
          setPendingLogs(filtered);
        }
      }
      if (approvalsRes.success) {
        setPendingApprovals(approvalsRes.data || []);
      }
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Security: Filter internships by current supervisor (client-side check)
  const allInternships = dashboard?.assigned_internships ?? [];
  const internships = allInternships.filter((i: any) => {
    const supervisorId = i.industry_supervisor?.user?.id ?? i.industry_supervisor?.id ?? i.industry_supervisor;
    return supervisorId === user?.id;
  });
  // Filter attendance and assessments to only include assigned students
  const allTodayAttendance: any[] = dashboard?.today_attendance ?? [];
  const todayAttendance = allTodayAttendance.filter((r: any) =>
    internships.some((i: any) => i.id === r.internship_id)
  );
  const totalStudents = internships.length;
  // Count pending assessments only for assigned students
  const allPendingAssessments = dashboard?.pending_assessments ?? 0;
  const pendingAssessments = internships.length > 0 ? allPendingAssessments : 0;

  const presentToday   = todayAttendance.filter((r: any) => ["present", "late"].includes(r.status)).length;
  const absentToday    = todayAttendance.filter((r: any) => r.status === "absent").length;
  const pendingVerify  = todayAttendance.filter((r: any) => !r.verified_by).length;

  const studentStats = internships.map((i: any) => {
    const logs = pendingLogs.filter((l: any) => l.internship_id === i.id);
    const todayRecord = todayAttendance.find((r: any) => r.internship_id === i.id);
    const activityStatus = todayRecord
      ? (["present", "late"].includes(todayRecord.status) ? "active" : "inactive")
      : "unknown";
    return { ...i, pendingLogCount: logs.length, todayRecord, activityStatus };
  });

  if (loading) return <SkeletonDashboard statCount={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h1>Industry Supervisor Portal</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Welcome, {user?.name}. You have {totalStudents} intern{totalStudents !== 1 ? "s" : ""} assigned.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Interns"
          value={totalStudents}
          subtitle="Currently active"
          icon={<GraduationCap className="w-4 h-4" />}
          highlight
        />
        <StatCard
          title="Pending Log Reviews"
          value={pendingLogs.length}
          subtitle="Submitted — awaiting review"
          icon={<BookMarked className="w-4 h-4" />}
        />
        <StatCard
          title="Today's Attendance"
          value={`${presentToday} / ${totalStudents}`}
          subtitle={`${absentToday} absent · ${pendingVerify} unverified`}
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatCard
          title="Pending Assessments"
          value={pendingAssessments}
          subtitle="Draft or not yet submitted"
          icon={<ClipboardCheck className="w-4 h-4" />}
        />
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <h4 className="text-blue-800">Student Approvals Pending</h4>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            {pendingApprovals.length} student{pendingApprovals.length > 1 ? "s" : ""} {pendingApprovals.length > 1 ? "have" : "has"} invited you to the platform.
          </p>
          <button
            onClick={() => navigate("/supervisor/approvals")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            style={{ fontSize: "0.85rem" }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Review {pendingApprovals.length} Invitation{pendingApprovals.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Action Alert */}
      {(pendingLogs.length > 0 || pendingVerify > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="text-amber-800">Actions Required</h4>
          </div>
          <div className="flex gap-3 flex-wrap">
            {pendingLogs.length > 0 && (
              <button
                onClick={() => navigate("/supervisor/logbooks")}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                style={{ fontSize: "0.85rem" }}
              >
                <BookMarked className="w-4 h-4" />
                Review {pendingLogs.length} pending log{pendingLogs.length > 1 ? "s" : ""}
              </button>
            )}
            {pendingVerify > 0 && (
              <button
                onClick={() => navigate("/supervisor/attendance")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                style={{ fontSize: "0.85rem" }}
              >
                <MapPin className="w-4 h-4" />
                Verify {pendingVerify} check-in{pendingVerify > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assessment Completion Checklist */}
      <AssessmentChecklistCard onNavigate={navigate} />

      {/* Students Overview */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3>Assigned Interns</h3>
          <div className="flex gap-4 text-muted-foreground" style={{ fontSize: "0.7rem" }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> No record</span>
          </div>
        </div>
        <div className="divide-y divide-border">
          {studentStats.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3>No interns currently assigned</h3>
              <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
                Students will appear here once they are placed at your company.
              </p>
            </div>
          ) : (
            studentStats.map((s: any) => (
              <div key={s.id} className="p-5 flex items-start gap-4 hover:bg-secondary/20 transition-colors">
                {/* Avatar with activity dot */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0" style={{ fontSize: "0.85rem" }}>
                    {getStudentName(s).split(" ").map((w: string) => w[0]).join("")}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${
                    s.activityStatus === "active"   ? "bg-emerald-500" :
                    s.activityStatus === "inactive" ? "bg-red-500"     : "bg-gray-300"
                  }`} />
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p style={{ fontSize: "0.95rem" }}>{getStudentName(s)}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">
                    {getStudentNum(s)} · {getDept(s)}
                  </p>
                  <div className="flex items-center gap-5 mt-2">
                    <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <BookMarked className="w-3.5 h-3.5" />
                      {s.pendingLogCount > 0
                        ? <span className="text-amber-600">{s.pendingLogCount} log{s.pendingLogCount > 1 ? "s" : ""} pending</span>
                        : <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Up to date</span>}
                    </span>
                    {s.todayRecord && (
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                        <Calendar className="w-3.5 h-3.5" />
                        Today: {s.todayRecord.check_in_time ?? s.todayRecord.status}
                      </span>
                    )}
                    <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <TrendingUp className="w-3.5 h-3.5" />
                      {getCompanyName(s)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate("/supervisor/logbooks")}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1.5 transition-colors"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <BookMarked className="w-3.5 h-3.5" /> Logs
                  </button>
                  <button
                    onClick={() => navigate(`/supervisor/evaluate?student=${s.id}`)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Evaluate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
