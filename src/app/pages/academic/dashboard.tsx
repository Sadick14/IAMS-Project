import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { StatCard } from "../../components/stat-card";
import { StatusBadge } from "../../components/status-badge";
import { apiClient } from "../../lib/api-client";
import {
  GraduationCap, BookMarked, ClipboardCheck, AlertTriangle, MapPin,
  BarChart3, ArrowRight, Calendar, Clock, CheckCircle2, Eye
} from "lucide-react";
import { useNavigate } from "react-router";
import { getNameInitials } from "../../lib/validation";

function getStudentName(i: any) { return i.student?.user?.name ?? "—"; }
function getStudentNum(i: any)  { return i.student?.student_id ?? "—"; }
function getCompanyName(i: any) { return i.company?.name ?? "—"; }
function getDept(i: any)        { return i.student?.department?.name ?? "—"; }

export function AcademicDashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.getDashboard("academic-supervisor"),
      apiClient.getNotifications({ per_page: 4 }),
    ]).then(([dashRes, notifRes]) => {
      if (cancelled) return;
      if (dashRes.success)  setDashboard(dashRes.data);
      if (notifRes.success) setNotifications(notifRes.data);
    });
    return () => { cancelled = true; };
  }, []);

  const internships: any[]    = dashboard?.assigned_internships ?? [];
  const pendingLogbooks: any[] = dashboard?.pending_logbooks     ?? [];
  const upcomingVisits: any[]  = dashboard?.upcoming_visitations ?? [];

  const totalStudents    = dashboard?.assigned_students ?? internships.length;
  const activeCount      = internships.filter((i) => i.status === "active").length;
  const completedCount   = internships.filter((i) => i.status === "completed").length;
  const pendingLogsCount = pendingLogbooks.length;
  const pendingEvals     = internships.filter((i) => i.status === "active").length;

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
          value={totalStudents}
          subtitle={`${activeCount} active · ${completedCount} completed`}
          icon={<GraduationCap className="w-4 h-4" />}
          highlight
        />
        <StatCard
          title="Pending Evaluations"
          value={pendingEvals}
          subtitle="Active internships awaiting assessment"
          icon={<ClipboardCheck className="w-4 h-4" />}
        />
        <StatCard
          title="Pending Logbooks"
          value={pendingLogsCount}
          subtitle="Submitted — awaiting your review"
          icon={<BookMarked className="w-4 h-4" />}
        />
        <StatCard
          title="Upcoming Site Visits"
          value={upcomingVisits.length}
          subtitle="Scheduled visits"
          icon={<MapPin className="w-4 h-4" />}
        />
      </div>

      {/* Alert Banner */}
      {(pendingLogsCount > 0 || pendingEvals > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="text-amber-800">Actions Required</h4>
          </div>
          <div className="flex gap-3 flex-wrap">
            {pendingLogsCount > 0 && (
              <button
                onClick={() => navigate("/academic/logbooks")}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                style={{ fontSize: "0.8rem" }}
              >
                <BookMarked className="w-4 h-4" />
                {pendingLogsCount} logbook{pendingLogsCount > 1 ? "s" : ""} to review
              </button>
            )}
            {pendingEvals > 0 && (
              <button
                onClick={() => navigate("/academic/evaluate")}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                style={{ fontSize: "0.8rem" }}
              >
                <ClipboardCheck className="w-4 h-4" />
                {pendingEvals} evaluation{pendingEvals > 1 ? "s" : ""} pending
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Students — 2 cols */}
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
            {internships.length === 0 ? (
              <div className="p-8 text-center">
                <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No students assigned yet.</p>
              </div>
            ) : (
              internships.map((i) => (
                <div key={i.id} className="p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.8rem" }}>
                    {getNameInitials(getStudentName(i))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p style={{ fontSize: "0.9rem" }}>{getStudentName(i)}</p>
                      <StatusBadge status={i.status} />
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      {getStudentNum(i)} · {getCompanyName(i)} · {getDept(i)}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/academic/evaluate")}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1 shrink-0"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
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
              <button onClick={() => navigate("/academic/visits")} className="text-primary hover:underline" style={{ fontSize: "0.75rem" }}>
                View all
              </button>
            </div>
            {upcomingVisits.length === 0 ? (
              <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No upcoming visits scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.map((v: any) => (
                  <div key={v.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p style={{ fontSize: "0.85rem" }}>{v.internship?.company?.name ?? v.company_name ?? "—"}</p>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      Student: {v.internship?.student?.user?.name ?? "—"}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Calendar className="w-3 h-3" /> {v.visit_date}
                      </span>
                      {v.visit_time && (
                        <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                          <Clock className="w-3 h-3" /> {v.visit_time}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Logbooks */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-primary" /> Pending Logbooks
              </h3>
              <button onClick={() => navigate("/academic/logbooks")} className="text-primary hover:underline" style={{ fontSize: "0.75rem" }}>
                View all
              </button>
            </div>
            {pendingLogbooks.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <p style={{ fontSize: "0.85rem" }}>All logbooks reviewed.</p>
              </div>
            ) : (
              pendingLogbooks.slice(0, 4).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p style={{ fontSize: "0.83rem" }} className="truncate">
                      {l.internship?.student?.user?.name ?? "—"}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                      {l.entry_date ?? l.date}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/academic/logbooks")}
                    className="px-2.5 py-1 bg-primary text-primary-foreground rounded-md shrink-0 ml-2"
                    style={{ fontSize: "0.75rem" }}
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-2">
            <h3 className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" /> Notifications
            </h3>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>No notifications.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-2.5 rounded-lg ${!n.is_read ? "bg-secondary/40" : ""}`}>
                  <p style={{ fontSize: "0.82rem" }}>{n.title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                    {new Date(n.created_at ?? n.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
