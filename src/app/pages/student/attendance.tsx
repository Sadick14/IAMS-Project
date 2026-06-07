import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { 
  Calendar, MapPin, Clock, AlertCircle, CheckCircle2, 
  RefreshCw, Award, Target, Building2, XCircle 
} from "lucide-react";
import { Card } from "../../components/ui/card";

export function StudentAttendancePage() {
  const { user } = useAppContext();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
  });
  const [internshipInfo, setInternshipInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAttendanceData();
    const interval = setInterval(loadAttendanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceData();
    setRefreshing(false);
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const dashRes = await apiClient.getDashboard("student");
      const activeInternship = dashRes.data?.active_internship;

      if (!activeInternship?.id) {
        setLoading(false);
        return;
      }

      setInternshipInfo(activeInternship);

      const filters: any = { per_page: 100 };
      if (activeInternship.start_date) filters.from_date = activeInternship.start_date;
      if (activeInternship.end_date) filters.to_date = activeInternship.end_date;

      const attRes = await apiClient.getInternshipAttendance(String(activeInternship.id), filters);

      if (attRes.success) {
        const data = attRes.data as any;
        const records = Array.isArray(data) ? data : (data?.attendance ?? []);
        
        // Filter only present/absent (ignore late/half_day if any)
        const filteredRecords = records.filter((r: any) => 
          r.status === "present" || r.status === "absent"
        );
        
        setAttendanceRecords(filteredRecords);

        const statsCounts = {
          present: filteredRecords.filter((r: any) => r.status === "present").length,
          absent: filteredRecords.filter((r: any) => r.status === "absent").length,
          total: filteredRecords.length,
        };
        setStats(statsCounts);
      }
    } catch (error) {
      console.error("Failed to load attendance data", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.present / stats.total) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
      case "absent":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "absent":
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const attendanceRate = calculateAttendanceRate();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2"></div>
          <div className="h-4 w-72 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (!internshipInfo) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-8 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Internship</h2>
          <p className="text-muted-foreground text-sm">
            You need an active internship to view attendance records. <br />
            Please contact your coordinator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {internshipInfo?.company?.name || "Your internship"}
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent transition-all disabled:opacity-50 text-sm font-medium shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats grid – 3 cards: Rate, Present, Absent */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance Rate Card */}
        <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Rate</span>
            <Award className="w-4 h-4 text-primary/70" />
          </div>
          <div className="text-3xl font-bold">{attendanceRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">Attendance rate</p>
          <div className="mt-3 h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }}></div>
          </div>
        </div>

        {/* Present */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.present}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Present</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Absent */}
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absent}</p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">Absent</p>
            </div>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Internship details card */}
      <Card className="p-4 border-border/60 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Internship Period
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Company</p>
            <p className="font-medium">{internshipInfo?.company?.name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Department</p>
            <p className="font-medium">{internshipInfo?.student?.department?.name || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Start Date</p>
            <p className="font-medium">{internshipInfo?.start_date ? new Date(internshipInfo.start_date).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">End Date</p>
            <p className="font-medium">{internshipInfo?.end_date ? new Date(internshipInfo.end_date).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
              {internshipInfo?.status || "—"}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Records</p>
            <p className="font-medium">{stats.total} days</p>
          </div>
        </div>
      </Card>

      {/* Attendance Records Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Daily Attendance Log
          </h3>
          <span className="text-xs text-muted-foreground">
            {attendanceRecords.length} entries
          </span>
        </div>

        {attendanceRecords.length === 0 ? (
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2">No Attendance Records</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  Attendance records only appear within your internship active period.
                </p>
                <div className="bg-white dark:bg-slate-900 rounded p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Start Date:</span>
                    <span className="font-semibold">{internshipInfo?.start_date ? new Date(internshipInfo.start_date).toLocaleDateString() : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600 dark:text-blue-400 font-medium">End Date:</span>
                    <span className="font-semibold">{internshipInfo?.end_date ? new Date(internshipInfo.end_date).toLocaleDateString() : "—"}</span>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                  Check-ins outside this period won't be recorded. If you believe this is incorrect, contact your coordinator.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {attendanceRecords
              .sort((a, b) => new Date(b.date || b.attendance_date || b.check_in_time || 0).getTime() - new Date(a.date || a.attendance_date || a.check_in_time || 0).getTime())
              .map((record) => {
                const recordDate = record.date || record.attendance_date || record.check_in_time;
                return (
                  <div key={record.id} className="group bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:block w-10 text-center">
                          <span className="text-xs font-bold text-muted-foreground">
                            {new Date(recordDate).toLocaleDateString(undefined, { weekday: 'short' })}
                          </span>
                          <span className="block text-lg font-semibold">
                            {new Date(recordDate).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm sm:hidden">
                            {new Date(recordDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                          </p>
                          <p className="hidden sm:block text-sm font-medium">
                            {new Date(recordDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          {record.check_in_time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                      {record.latitude && record.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline transition"
                        >
                          <MapPin className="w-3 h-3" />
                          View location
                        </a>
                      )}
                      {record.notes && (
                        <p className="text-muted-foreground italic flex items-center gap-1">
                          <span className="font-medium not-italic">Note:</span> {record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Guidelines – simplified */}
      <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Attendance Definitions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span>Present – Checked in and completed the day</span></div>
          <div className="flex items-center gap-2"><XCircle className="w-3.5 h-3.5 text-red-500" /><span>Absent – No check‑in recorded</span></div>
        </div>
      </div>
    </div>
  );
}