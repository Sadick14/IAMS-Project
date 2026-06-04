import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { StatusBadge } from "../../components/status-badge";
import { BookMarked, Clock, Award, ArrowRight, Calendar, MapPin, Mail, User, AlertCircle, CheckCircle2, Zap, FileText, MessageSquare, Briefcase, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";

export function StudentDashboard() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [visitations, setVisitations] = useState<any[]>([]);
  const [pendingApplication, setPendingApplication] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshDashboard = async () => {
    setRefreshing(true);
    try {
      const [dashRes, visRes, appsRes, internshipRes] = await Promise.all([
        apiClient.getDashboard("student"),
        apiClient.getSiteVisitations(),
        apiClient.getApplications(),
        apiClient.getInternships(), // Fetch internship data to get approved applications
      ]);
      if (dashRes.success) setDashboard(dashRes.data);
      if (visRes.success) setVisitations(visRes.data);
      if (appsRes.success && appsRes.data) {
        const apps = Array.isArray(appsRes.data) ? appsRes.data : appsRes.data.applications || [];
        // Show pending, approved, or rejected applications (don't show completed)
        const pending = apps.find(
          (app) => app && ["submitted", "under_review", "approved", "rejected"].includes((app.status ?? "").toLowerCase())
        );
        setPendingApplication(pending || null);
      }
      // internshipRes is fetched to update dashboard with approved internship data
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    refreshDashboard();
  }, []);

  // Auto-refresh every 8 seconds to catch DLO approvals
  useEffect(() => {
    const interval = setInterval(refreshDashboard, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeInternship = dashboard?.active_internship;
  const recentLogbooks: any[] = dashboard?.recent_logbooks ?? [];
  const attendanceSummary = dashboard?.attendance_summary;
  const publishedGrade = dashboard?.published_grade;

  const companyName = activeInternship?.company?.name ?? "N/A";
  const appStatus = activeInternship?.status ?? "none";
  const supervisorName = activeInternship?.academic_supervisor?.user?.name ?? activeInternship?.academicSupervisor?.user?.name ?? null;

  return (
    <div className="space-y-6">
      {/* Top Bar: Search and Profile */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshDashboard}
            disabled={refreshing}
            className="px-3 py-2 bg-muted hover:bg-muted/80 disabled:opacity-50 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
            title="Refresh dashboard (auto-refreshes every 8s)"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-muted-foreground text-xs">3rd year</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Content: 2 columns */}
        <div className="space-y-6 lg:col-span-2">

          {/* Hero Banner - Based on Application Status */}
          {activeInternship ? (
            <div className="bg-gradient-to-r from-primary/80 via-primary/60 to-primary/40 rounded-2xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-sm opacity-90 mb-2">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(" ")[0]}!</h1>
                <p className="opacity-90 text-sm">Always stay updated with your internship progress</p>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center">
                <Award className="w-40 h-40" />
              </div>
            </div>
          ) : pendingApplication?.status?.toLowerCase() === "approved" ? (
            <div className="bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-950/30 dark:to-green-950/30 rounded-2xl p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">🎉 Application Approved!</h1>
                  <p className="text-sm mb-4">Congratulations! Your application for <span className="font-semibold">{pendingApplication?.company?.name || "a position"}</span> has been approved by the DLO.</p>
                  <div className="space-y-2 mb-4 text-sm">
                    <p>📋 <strong>Next Steps:</strong></p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Download your Placement Letter from Applications</li>
                      <li>Get the Company Acceptance Form from your DLO</li>
                      <li>Have the company/supervisor sign the form</li>
                      <li>Submit the completed form to activate your internship</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => navigate("/student/applications")}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    View Documents <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            </div>
          ) : pendingApplication?.status?.toLowerCase() === "rejected" ? (
            <div className="bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-950/30 dark:to-rose-950/30 rounded-2xl p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Application Not Approved</h1>
                  <p className="text-sm mb-4">Your application for <span className="font-semibold">{pendingApplication?.company?.name || "a position"}</span> was not approved at this time.</p>
                  <p className="text-sm mb-4">You can now apply for other internship positions. Review feedback from your DLO and apply to another opportunity.</p>
                  <button
                    onClick={() => navigate("/student/applications")}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    Apply Again <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
              </div>
            </div>
          ) : pendingApplication ? (
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Application Under Review</h1>
                  <p className="text-sm mb-4">Your application for <span className="font-semibold">{pendingApplication?.company?.name || "a position"}</span> is awaiting approval from the Department Liaison Officer</p>
                  <button
                    onClick={() => navigate("/student/applications")}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    View Application <ArrowRight className="w-4 h-4 inline ml-2" />
                  </button>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Applied</div>
                  <div className="text-sm font-semibold">
                    {pendingApplication?.created_at
                      ? new Date(pendingApplication.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl p-8">
              <h1 className="text-3xl font-bold mb-2">Ready to start?</h1>
              <p className="text-sm mb-4">Submit an application to begin your industrial attachment</p>
              <button
                onClick={() => navigate("/student/applications")}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Apply Now <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          )}

          {/* Key Metrics / Internship Info Section */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold">Internship Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Company Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Company</p>
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-bold text-sm">{activeInternship ? companyName : "N/A"}</h3>
                <p className="text-muted-foreground text-xs">{activeInternship?.company?.industry ?? "No assignment"}</p>
              </div>

              {/* Term Name Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Term</p>
                  <Calendar className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-sm">{activeInternship?.term?.name ?? "N/A"}</h3>
                <p className="text-muted-foreground text-xs">{activeInternship?.term?.year ? `Year ${activeInternship.term.year}` : "Pending approval"}</p>
              </div>

              {/* Current Status Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold capitalize">{appStatus}</h3>
                  <StatusBadge status={appStatus} />
                </div>
              </div>

              {/* Logbook Entries Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Logbook</p>
                  <BookMarked className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold">{recentLogbooks.length}</h3>
                <p className="text-muted-foreground text-xs">{recentLogbooks.length > 0 ? "Latest: " + new Date(recentLogbooks[0].entry_date).toLocaleDateString() : "Start logging"}</p>
              </div>

              {/* Attendance Card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Attendance</p>
                  <Clock className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="text-2xl font-bold">{attendanceSummary?.attendance_rate ?? "—"}%</h3>
                <p className="text-muted-foreground text-xs">{attendanceSummary ? attendanceSummary.present + " present" : "No data"}</p>
              </div>
            </div>
          </div>

          {/* Enrolled Courses / Active Internship */}
          {activeInternship && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Current Placement</h2>
                <button onClick={() => navigate("/student/applications")} className="text-primary hover:opacity-75 text-sm font-semibold flex items-center gap-1">
                  See all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{companyName}</h3>
                    <p className="text-muted-foreground text-sm">{activeInternship?.company?.industry ?? "Industrial Attachment"}</p>
                  </div>
                  <StatusBadge status={appStatus} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeInternship?.company?.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs">Location</p>
                        <p className="font-medium text-sm truncate">{activeInternship.company.location}</p>
                      </div>
                    </div>
                  )}
                  {supervisorName && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs">Academic Advisor</p>
                        <p className="font-medium text-sm truncate">{supervisorName}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => navigate("/student/logbook")}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-semibold"
                  >
                    Logbook
                  </button>
                  <button
                    onClick={() => navigate("/student/attendance")}
                    className="flex-1 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-semibold"
                  >
                    Attendance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Notices and Info */}
        <div className="space-y-6">

          {/* Course Instructors / Supervisors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Course Advisors</h3>
              <button className="text-primary hover:opacity-75 text-xs font-semibold">See all</button>
            </div>
            {supervisorName ? (
              <div className="bg-card border border-border rounded-xl p-4 text-center space-y-3">
                <div className="flex justify-center">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${supervisorName}`}
                    alt={supervisorName}
                    className="w-12 h-12 rounded-full"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">{supervisorName}</p>
                  <p className="text-muted-foreground text-xs">Academic Advisor</p>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
                No supervisor assigned
              </div>
            )}
          </div>

          {/* Daily Notices */}
          <div className="space-y-3">
            <h3 className="font-bold">Daily Notices</h3>

            {publishedGrade ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-emerald-900 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Grade Available
                </p>
                <p className="text-muted-foreground text-xs">Your grade has been published</p>
                <button
                  onClick={() => navigate("/student/grades")}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline text-xs font-semibold"
                >
                  View Grade →
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-amber-900 dark:text-amber-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Evaluation Pending
                </p>
                <p className="text-muted-foreground text-xs">Your grade will be available after evaluation</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-400 text-sm">Internship Active</p>
              <p className="text-muted-foreground text-xs">Keep your logbook updated regularly to ensure smooth progress tracking</p>
              <button
                onClick={() => navigate("/student/logbook")}
                className="text-blue-700 dark:text-blue-400 hover:underline text-xs font-semibold"
              >
                Add Entry →
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="font-bold">Quick Access</h3>
            <div className="space-y-2">
              {[
                { label: "My Profile", Icon: User, action: () => navigate("/student/profile-setup") },
                { label: "Documents", Icon: FileText, action: () => navigate("/student/documents") },
                { label: "Messages", Icon: MessageSquare, action: () => navigate("/student/communications") },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:shadow-sm transition-all text-left"
                >
                  <item.Icon className="w-5 h-5 text-primary" />
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
