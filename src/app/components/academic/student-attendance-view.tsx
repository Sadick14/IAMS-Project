import { MapPin } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkInType: string;
  location: string;
  verificationStatus: string;
}

interface StudentAttendanceViewProps {
  attendanceRecords: AttendanceRecord[];
}

export function StudentAttendanceView({ attendanceRecords }: StudentAttendanceViewProps) {
  return (
    <div className="space-y-3">
      {attendanceRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3" />
          <p style={{ fontSize: "0.85rem" }}>No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    DATE
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    CHECK-IN
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    TYPE
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    LOCATION
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendanceRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium" style={{ fontSize: "0.85rem" }}>
                      {r.date}
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                      {r.checkInTime}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.checkInType === "gps"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {r.checkInType === "gps" ? "GPS" : "Manual"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-muted-foreground max-w-[200px] truncate"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {r.location}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.verificationStatus === "Verified"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : r.verificationStatus === "Rejected"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {r.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
