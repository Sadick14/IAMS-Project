import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { Calendar, MapPin, Clock, TrendingUp, AlertCircle, CheckCircle2, User, BarChart3 } from "lucide-react";
import { Card } from "../../components/ui/card";

export function StudentAttendancePage() {
  const { user } = useAppContext();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    total: 0,
  });
  const [internshipInfo, setInternshipInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      // Get active internship
      const dashRes = await apiClient.getDashboard("student");
      const activeInternship = dashRes.data?.active_internship;

      if (!activeInternship?.id) {
        setLoading(false);
        return;
      }

      setInternshipInfo(activeInternship);

      // Fetch attendance records
      const attRes = await apiClient.getInternshipAttendance(String(activeInternship.id), {
        per_page: 100,
      });

      if (attRes.success) {
        const records = Array.isArray(attRes.data) ? attRes.data : attRes.data?.attendance ?? [];
        setAttendanceRecords(records);

        // Calculate stats
        const statsCounts = {
          present: records.filter((r: any) => r.status === "present").length,
          absent: records.filter((r: any) => r.status === "absent").length,
          late: records.filter((r: any) => r.status === "late").length,
          halfDay: records.filter((r: any) => r.status === "half_day").length,
          total: records.length,
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
    const presentDays = stats.present + stats.late + stats.halfDay;
    return Math.round((presentDays / stats.total) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "absent":
        return "bg-red-100 text-red-700 border-red-300";
      case "late":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "half_day":
        return "bg-blue-100 text-blue-700 border-blue-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
      case "late":
      case "half_day":
        return <CheckCircle2 className="w-4 h-4" />;
      case "absent":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1>Attendance Performance</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const attendanceRate = calculateAttendanceRate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>Attendance Performance</h1>
        <p className="text-muted-foreground mt-1">
          {internshipInfo?.company?.name
            ? `Track your attendance at ${internshipInfo.company.name}`
            : "View your internship attendance records"}
        </p>
      </div>

      {!internshipInfo ? (
        <Card className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold">No Active Internship</h3>
          <p className="text-muted-foreground mt-2">
            You need an active internship to view attendance records.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Attendance Rate */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{attendanceRate}%</p>
              <p className="text-muted-foreground text-sm mt-1">Attendance Rate</p>
            </div>

            {/* Present Days */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-700">{stats.present}</p>
              <p className="text-emerald-600 text-sm mt-1">Present</p>
            </div>

            {/* Late Days */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-700">{stats.late}</p>
              <p className="text-amber-600 text-sm mt-1">Late</p>
            </div>

            {/* Half Day */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-700">{stats.halfDay}</p>
              <p className="text-blue-600 text-sm mt-1">Half Day</p>
            </div>

            {/* Absent Days */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
              <p className="text-red-600 text-sm mt-1">Absent</p>
            </div>
          </div>

          {/* Internship Info Card */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Internship Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Company</p>
                <p className="font-medium mt-1">{internshipInfo?.company?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Department</p>
                <p className="font-medium mt-1">{internshipInfo?.student?.department ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Status</p>
                <p className="font-medium mt-1 capitalize">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm">
                    {internshipInfo?.status ?? "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Attendance Records
              </h3>
              <p className="text-muted-foreground text-sm mt-1">{stats.total} total records</p>
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No attendance records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-5 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-5 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-5 py-3 text-left text-sm font-semibold">Check-in Time</th>
                      <th className="px-5 py-3 text-left text-sm font-semibold">Location</th>
                      <th className="px-5 py-3 text-left text-sm font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendanceRecords
                      .sort((a: any, b: any) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime())
                      .map((record: any) => (
                        <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-sm">
                              {new Date(record.attendance_date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                record.status
                              )}`}
                            >
                              {getStatusIcon(record.status)}
                              {record.status?.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-sm">
                              {record.check_in_time
                                ? new Date(record.check_in_time).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              {record.latitude && record.longitude ? (
                                <a
                                  href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline text-sm"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                  View Map
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-muted-foreground">{record.notes ?? "—"}</p>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Attendance Guidelines
            </h3>
            <ul className="mt-3 space-y-2 text-blue-800 dark:text-blue-200 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold min-w-fit">Present:</span>
                <span>You arrived on time and worked the full day</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-fit">Late:</span>
                <span>You arrived after the official start time but still worked the full day</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-fit">Half Day:</span>
                <span>You worked only part of the day (morning or afternoon)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-fit">Absent:</span>
                <span>You did not attend work for the day</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
