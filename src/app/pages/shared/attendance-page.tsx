import { useState, useEffect, useCallback } from "react";
import { SkeletonTableRows } from "../../components/skeleton";
import { apiClient } from "../../lib/api-client";
import { CheckCircle2, XCircle, AlertTriangle, Clock, Search, X, Navigation } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";
import { Card, CardContent } from "../../components/ui/card";
import { StatCard } from "../../components/stat-card";

interface Props {
  viewRole: ExtendedRole;
}

function studentName(r: any) { return r.internship?.student?.user?.name ?? r.student?.user?.name ?? "—"; }
function studentNum(r: any) { return r.internship?.student?.student_id ?? r.student?.student_id ?? "—"; }
function dept(r: any) { return r.internship?.student?.department?.name ?? "—"; }

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-blue-100 text-blue-700",
  excused: "bg-violet-100 text-violet-700",
  absent: "bg-red-100 text-red-700",
};

export function AttendancePage({ viewRole }: Props) {
  const [records, setRecords] = useState<any[]>([]);
  const [missed, setMissed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const canVerify = viewRole === "supervisor" || viewRole === "clo" || viewRole === "dlo";

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [attRes, missedRes] = await Promise.all([
      apiClient.getAttendance({
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
        per_page: 100,
      }),
      apiClient.getMissedAttendance(),
    ]);
    if (attRes.success) setRecords(attRes.data);
    if (missedRes.success) setMissed(missedRes.data);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = studentFilter
    ? records.filter((r) =>
        studentName(r).toLowerCase().includes(studentFilter.toLowerCase()) ||
        studentNum(r).toLowerCase().includes(studentFilter.toLowerCase()))
    : records;

  const pendingVerification = records.filter((r) => !r.verified_by);
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const verificationRate = records.length > 0
    ? Math.round((records.filter((r) => r.verified_by).length / records.length) * 100)
    : 0;

  const handleVerify = async (recordId: string, status: string) => {
    const res = await apiClient.verifyAttendance(recordId, status);
    if (res.success) {
      toast.success(res.message ?? `Attendance marked ${status}.`);
      setSelectedRecord(null);
      fetchData();
    } else {
      toast.error(res.message ?? "Verification failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/60 border border-border text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Live attendance oversight
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {viewRole === "supervisor" ? "Attendance Review" : "Attendance Records"}
            </h1>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.9rem" }}>
              {viewRole === "clo" ? "Institution-wide attendance tracking" : viewRole === "supervisor" ? "Verify student check-ins" : "Department attendance overview"}
              {" · "}Click any row to inspect details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[48rem]">
          <StatCard title="Records" value={records.length} subtitle="Loaded in view" icon={<Clock className="w-4 h-4" />} />
          <StatCard title="Present" value={presentCount} subtitle="On-site check-ins" icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard title="Pending" value={pendingVerification.length} subtitle="Needs review" icon={<AlertTriangle className="w-4 h-4" />} />
          <StatCard title="Verified" value={`${verificationRate}%`} subtitle="Verification rate" icon={<Navigation className="w-4 h-4" />} highlight />
        </div>
      </div>

      {missed.length > 0 && (viewRole === "clo" || viewRole === "dlo" || viewRole === "academic") && (
        <Card className="overflow-hidden border-amber-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <h4 className="font-semibold text-sm">Missed Check-In Alerts</h4>
                <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Students without a recorded check-in today</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200" style={{ fontSize: "0.75rem" }}>
              {missed.length} flagged
            </span>
          </div>
          <div className="divide-y divide-border">
            {missed.slice(0, 5).map((m: any, i: number) => (
              <div key={m.id ?? i} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                    {studentName(m).split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium leading-tight" style={{ fontSize: "0.9rem" }}>{studentName(m)}</p>
                    <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>{m.company?.name ?? studentNum(m)}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[0.65rem] font-semibold uppercase">
                  No check-in today
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canVerify && pendingVerification.length > 0 && (
        <Card className="border-primary/30 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
              <div>
                <h3 className="font-semibold text-sm">Pending Verification</h3>
                <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Approve or reject attendance submitted by students</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {pendingVerification.length} waiting
              </span>
            </div>
            <div className="p-4 space-y-3">
              {pendingVerification.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
                  <button onClick={() => setSelectedRecord(r)} className="text-left flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                        {studentName(r).split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium" style={{ fontSize: "0.9rem" }}>{studentName(r)}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>
                          {r.attendance_date} · {r.check_in_time ?? "—"} · {r.status}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleVerify(String(r.id), "present")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Verify
                    </button>
                    <button
                      onClick={() => handleVerify(String(r.id), "absent")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Filters</h3>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Narrow the attendance list by student and date range</p>
            </div>
            {(studentFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setStudentFilter(""); setDateFrom(""); setDateTo(""); }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-muted-foreground block mb-1" style={{ fontSize: "0.75rem" }}>Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  placeholder="Name or ID..."
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
            <div>
              <label className="text-muted-foreground block mb-1" style={{ fontSize: "0.75rem" }}>From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1" style={{ fontSize: "0.75rem" }}>To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4 bg-secondary/20">
              <div>
                <h3 className="font-semibold text-base">Attendance Detail</h3>
                <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Review record, timing, location, and verification state</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground" style={{ fontSize: "0.85rem" }}>
                  {studentName(selectedRecord).split(" ").map((w: string) => w[0]).join("")}
                </div>
                <div>
                  <p className="font-medium" style={{ fontSize: "1rem" }}>{studentName(selectedRecord)}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{studentNum(selectedRecord)} · {dept(selectedRecord)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: "0.65rem" }}>Date</p>
                  <p style={{ fontSize: "0.9rem" }}>{selectedRecord.attendance_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: "0.65rem" }}>Status</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg capitalize border ${STATUS_COLORS[selectedRecord.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`} style={{ fontSize: "0.8rem" }}>
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: "0.65rem" }}>Check-In</p>
                  <p style={{ fontSize: "0.9rem" }} className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {selectedRecord.check_in_time ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: "0.65rem" }}>Check-Out</p>
                  <p style={{ fontSize: "0.9rem" }} className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {selectedRecord.check_out_time ?? "Pending"}
                  </p>
                </div>
              </div>
              {(selectedRecord.gps_check_in_lat || selectedRecord.notes) && (
                <div>
                  <p className="text-muted-foreground uppercase tracking-wider mb-2" style={{ fontSize: "0.65rem" }}>Location / Notes</p>
                  <div className="bg-secondary/50 rounded-xl p-4 space-y-2 border border-border">
                    {selectedRecord.gps_check_in_lat && (
                      <p className="flex items-center gap-1.5" style={{ fontSize: "0.85rem" }}>
                        <Navigation className="w-4 h-4 text-muted-foreground" /> {selectedRecord.gps_check_in_lat}, {selectedRecord.gps_check_in_lng}
                      </p>
                    )}
                    {selectedRecord.notes && <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>{selectedRecord.notes}</p>}
                  </div>
                </div>
              )}
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-2" style={{ fontSize: "0.65rem" }}>Verification</p>
                {selectedRecord.verified_by ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200" style={{ fontSize: "0.8rem" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200" style={{ fontSize: "0.8rem" }}>
                    <Clock className="w-3.5 h-3.5" /> Pending Verification
                  </span>
                )}
              </div>
            </div>
            {canVerify && !selectedRecord.verified_by && (
              <div className="px-6 py-4 border-t border-border bg-secondary/20 flex justify-end gap-2">
                <button
                  onClick={() => handleVerify(String(selectedRecord.id), "present")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  style={{ fontSize: "0.85rem" }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify Present
                </button>
                <button
                  onClick={() => handleVerify(String(selectedRecord.id), "absent")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  style={{ fontSize: "0.85rem" }}
                >
                  <XCircle className="w-4 h-4" /> Mark Absent
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Student</th>
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Date</th>
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Check-In</th>
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Check-Out</th>
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Verified</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={6} cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/25 cursor-pointer" onClick={() => setSelectedRecord(r)}>
                    <td className="px-4 py-4">
                      <p style={{ fontSize: "0.85rem" }}>{studentName(r)}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{studentNum(r)}</p>
                    </td>
                    <td className="px-4 py-4" style={{ fontSize: "0.85rem" }}>{r.attendance_date}</td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1" style={{ fontSize: "0.85rem" }}>
                        <Clock className="w-3 h-3 text-muted-foreground" /> {r.check_in_time ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4" style={{ fontSize: "0.85rem" }}>
                      {r.check_out_time ?? <span className="text-muted-foreground italic" style={{ fontSize: "0.75rem" }}>Pending</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded capitalize border ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`} style={{ fontSize: "0.7rem" }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {r.verified_by
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <span className="flex items-center gap-1 text-amber-600" style={{ fontSize: "0.7rem" }}><Clock className="w-3 h-3" /> Pending</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
