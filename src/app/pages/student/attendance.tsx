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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {internshipInfo?.company?.name
            ? `${internshipInfo.company.name}`
            : "View your records"}
        </p>
      </div>

      {!internshipInfo ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">No Active Internship</h3>
          <p className="text-muted-foreground text-xs mt-1">
            You need an active internship to view attendance records.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary Stats - Mobile optimized */}
          <div className="grid grid-cols-3 gap-2">
            {/* Attendance Rate - Large */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3 text-center col-span-3">
              <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
              <p className="text-muted-foreground text-xs mt-0.5">Attendance Rate</p>
            </div>

            {/* Present Days */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{stats.present}</p>
              <p className="text-emerald-600 text-xs mt-0.5">Present</p>
            </div>

            {/* Late Days */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{stats.late}</p>
              <p className="text-amber-600 text-xs mt-0.5">Late</p>
            </div>

            {/* Half Day */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-700">{stats.halfDay}</p>
              <p className="text-blue-600 text-xs mt-0.5">Half Day</p>
            </div>

            {/* Absent Days */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-700">{stats.absent}</p>
              <p className="text-red-600 text-xs mt-0.5">Absent</p>
            </div>
          </div>

          {/* Internship Info Card */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Company</p>
                <p className="font-medium">{internshipInfo?.company?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Department</p>
                <p className="font-medium">{internshipInfo?.student?.department ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <span className="inline-block px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                  {internshipInfo?.status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Records - Card List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Records ({stats.total})</h3>

            {attendanceRecords.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-border">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No attendance records yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendanceRecords
                  .sort((a: any, b: any) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime())
                  .map((record: any) => (
                    <div key={record.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {new Date(record.attendance_date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {getStatusIcon(record.status)}
                          {record.status?.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs space-y-1">
                        {record.check_in_time && (
                          <p className="text-muted-foreground">
                            <span className="font-medium">Check-in:</span> {new Date(record.check_in_time).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        {record.latitude && record.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            View Location
                          </a>
                        )}
                        {record.notes && (
                          <p className="text-muted-foreground"><span className="font-medium">Notes:</span> {record.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Attendance Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              Guidelines
            </h3>
            <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-xs">
              <li><span className="font-medium">Present:</span> On time, full day</li>
              <li><span className="font-medium">Late:</span> After start time, worked full day</li>
              <li><span className="font-medium">Half Day:</span> Partial day attendance</li>
              <li><span className="font-medium">Absent:</span> Did not attend</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
