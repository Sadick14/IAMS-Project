import { useAppContext } from "../../lib/context";
import { StatCard } from "../../components/stat-card";
import { getStudentLogbook, checkInactiveStudents } from "../../services/logbook-service";
import { getAttendanceRecords } from "../../services/attendance-service";
import {
  Users, ClipboardCheck, BookOpen, AlertTriangle, Calendar, MapPin,
  BookMarked, TrendingUp, Eye, ArrowRight, Clock, CheckCircle2,
  GraduationCap, Building2, BarChart3
} from "lucide-react";
import { useNavigate } from "react-router";

export function AcademicDashboard() {
  const { user, store } = useAppContext();
  const navigate = useNavigate();

  // Academic supervisors see students assigned to them
  const assignedStudents = store.applications.filter(
    (a) => a.supervisorAssigned === user?.name && (a.status === "Active" || a.status === "Completed")
  );

  // Also show all dept students as fallback for demo
  const deptStudents = store.applications.filter(
    (a) => a.department === user?.department && (a.status === "Active" || a.status === "Completed")
  );
  const students = assignedStudents.length > 0 ? assignedStudents : deptStudents;

  // Aggregate metrics
  const allLogs = students.flatMap((a) => getStudentLogbook(a.studentId));
  const pendingLogs = allLogs.filter((l) => l.approvalStatus === "Pending").length;
  const approvedLogs = allLogs.filter((l) => l.approvalStatus === "Approved").length;

  // Attendance
  const allAttendance = students.flatMap((a) => getAttendanceRecords({ studentId: a.studentId }));
  const avgAttendanceRate = allAttendance.length > 0
    ? Math.round((allAttendance.filter((r) => r.verificationStatus === "Verified").length / allAttendance.length) * 100)
    : 0;

  // Flagged students (3+ days inactive)
  const flaggedStudents = checkInactiveStudents().filter((s) => s.status !== "green");

  // Pending evaluations
  const pendingEvals = students.filter((s) => s.status === "Active" && !s.grade);
  const submittedGrades = students.filter((s) => s.gradeStatus === "Submitted" || s.gradeStatus === "Approved");

  // Per-student data
  const studentData = students.map((app) => {
    const logs = getStudentLogbook(app.studentId);
    const pending = logs.filter((l) => l.approvalStatus === "Pending").length;
    const lastLog = logs.sort((a, b) => b.date.localeCompare(a.date))[0];
    const today = new Date();
    const lastLogDate = lastLog ? new Date(lastLog.date) : null;
    const daysSinceLog = lastLogDate
      ? Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      ...app,
      totalLogs: logs.length,
      pendingLogs: pending,
      lastLogDate: lastLog?.date || "N/A",
      daysSinceLog,
      isFlagged: daysSinceLog >= 3,
    };
  });

  // Mock upcoming visits
  const upcomingVisits: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1>Academic Supervisor Dashboard</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Welcome, {user?.name} · {user?.department}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/academic/evaluate")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <ClipboardCheck className="w-4 h-4" /> Evaluate Students
          </button>
          <button
            onClick={() => navigate("/academic/visits")}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <MapPin className="w-4 h-4" /> Site Visits
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Students"
          value={students.length}
          subtitle={`${students.filter((s) => s.status === "Active").length} active · ${students.filter((s) => s.status === "Completed").length} completed`}
          icon={<GraduationCap className="w-4 h-4" />}
          highlight
        />
        <StatCard
          title="Pending Evaluations"
          value={pendingEvals.length}
          subtitle={`${submittedGrades.length} grade${submittedGrades.length !== 1 ? "s" : ""} submitted`}
          icon={<ClipboardCheck className="w-4 h-4" />}
        />
        <StatCard
          title="Logbook Entries"
          value={allLogs.length}
          subtitle={`${pendingLogs} pending · ${approvedLogs} approved`}
          icon={<BookMarked className="w-4 h-4" />}
        />
        <StatCard
          title="Attendance Rate"
          value={`${avgAttendanceRate}%`}
          subtitle={`${allAttendance.length} total check-ins`}
          icon={<MapPin className="w-4 h-4" />}
        />
      </div>

      {/* Action Alerts */}
      {(flaggedStudents.length > 0 || pendingEvals.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="text-amber-800">Actions Required</h4>
          </div>
          <div className="flex gap-3 flex-wrap">
            {flaggedStudents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg" style={{ fontSize: "0.8rem" }}>
                <AlertTriangle className="w-4 h-4" />
                {flaggedStudents.length} student{flaggedStudents.length > 1 ? "s" : ""} with 3+ days no logbook entries
              </div>
            )}
            {pendingEvals.length > 0 && (
              <button
                onClick={() => navigate("/academic/evaluate")}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                style={{ fontSize: "0.8rem" }}
              >
                <ClipboardCheck className="w-4 h-4" /> {pendingEvals.length} evaluation{pendingEvals.length > 1 ? "s" : ""} pending
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students Overview - 2 cols */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3>Assigned Students</h3>
            <button
              onClick={() => navigate("/academic/students")}
              className="text-primary hover:underline flex items-center gap-1"
              style={{ fontSize: "0.8rem" }}
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {studentData.length === 0 ? (
              <div className="p-8 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No students assigned yet.</p>
              </div>
            ) : (
              studentData.map((s) => (
                <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.8rem" }}>
                      {s.studentName.split(" ").map((w) => w[0]).join("")}
                    </div>
                    {s.isFlagged && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-card flex items-center justify-center">
                        <AlertTriangle className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p style={{ fontSize: "0.9rem" }}>{s.studentName}</p>
                      <span className={`px-2 py-0.5 rounded ${
                        s.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`} style={{ fontSize: "0.65rem" }}>
                        {s.status}
                      </span>
                      {s.isFlagged && (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700" style={{ fontSize: "0.65rem" }}>
                          {s.daysSinceLog}d inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        {s.studentId} · {s.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <BookMarked className="w-3 h-3" /> {s.totalLogs} entries
                        {s.pendingLogs > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded ml-1" style={{ fontSize: "0.6rem" }}>
                            {s.pendingLogs} pending
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Calendar className="w-3 h-3" /> Last: {s.lastLogDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate("/academic/evaluate")}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Upcoming Site Visits */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Upcoming Visits
              </h3>
              <button
                onClick={() => navigate("/academic/visits")}
                className="text-primary hover:underline"
                style={{ fontSize: "0.75rem" }}
              >
                View all
              </button>
            </div>
            {upcomingVisits.length === 0 ? (
              <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No upcoming visits.</p>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.map((visit) => (
                  <div key={visit.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p style={{ fontSize: "0.85rem" }}>{visit.company}</p>
                      <span className={`px-2 py-0.5 rounded ${
                        visit.status === "Scheduled" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`} style={{ fontSize: "0.6rem" }}>
                        {visit.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      Student: {visit.student}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Calendar className="w-3 h-3" /> {visit.date}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Clock className="w-3 h-3" /> {visit.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grade Summary */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Grading Progress
            </h3>
            <div className="space-y-3">
              {[
                { label: "Not Started", count: students.filter((s) => !s.grade).length, color: "bg-gray-200" },
                { label: "Submitted", count: students.filter((s) => s.gradeStatus === "Submitted").length, color: "bg-amber-400" },
                { label: "Approved", count: students.filter((s) => s.gradeStatus === "Approved").length, color: "bg-emerald-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: "0.85rem" }}>{item.count}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/academic/grades")}
              className="w-full py-2 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-2 mt-2"
              style={{ fontSize: "0.8rem" }}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Open Grading
            </button>
          </div>

          {/* Flagged Students */}
          {flaggedStudents.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <h3 className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Inactive Students
              </h3>
              <div className="space-y-2">
                {flaggedStudents.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-100">
                    <div>
                      <p className="text-red-800" style={{ fontSize: "0.85rem" }}>{s.studentName}</p>
                      <p className="text-red-600" style={{ fontSize: "0.7rem" }}>
                        Last log: {s.lastLogDate} ({s.daysSinceLog}d ago)
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded ${
                      s.status === "red" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
                    }`} style={{ fontSize: "0.6rem" }}>
                      {s.daysSinceLog >= 7 ? "Critical" : "Warning"}
                    </span>
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