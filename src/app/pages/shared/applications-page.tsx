import { useState, useEffect, useCallback } from "react";
import { SkeletonTableRows } from "../../components/skeleton";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { Search, CheckCircle2, XCircle, UserPlus, Download } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";
import { exportToCSV } from "../../lib/csv-export";

interface Props {
  viewRole: ExtendedRole;
}

export function ApplicationsPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const [applications, setApplications] = useState<any[]>([]);
  const [academicSupervisors, setAcademicSupervisors] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getApplications();
    if (res.success) setApplications(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    apiClient.getUsers({ role: "academic_supervisor" }).then((res) => {
      if (res.success) setAcademicSupervisors(res.data);
    });
  }, []);

  const filtered = applications.filter((a) => {
    const studentName = a.student?.user?.name ?? a.student?.name ?? a.studentName ?? "";
    const companyName = a.company?.name ?? a.companyName ?? "";
    const matchSearch =
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      companyName.toLowerCase().includes(search.toLowerCase());
    const appStatus = a.status ?? "";
    const matchStatus = statusFilter === "All" || appStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  // Students can filter their own drafts; staff never see drafts (backend excludes them)
  const statuses = viewRole === "student"
    ? ["All", "draft", "submitted", "under_review", "approved", "rejected"]
    : ["All", "submitted", "under_review", "approved", "rejected", "company_accepted"];

  const handleApprove = async (id: string) => {
    const res = await apiClient.approveApplication(id);
    if (res.success) {
      toast.success(res.message ?? "Application approved.");
      fetchApplications();
    } else {
      toast.error(res.message ?? "Failed to approve application.");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    const res = await apiClient.rejectApplication(id, reason);
    if (res.success) {
      toast.success(res.message ?? "Application rejected.");
      fetchApplications();
    } else {
      toast.error(res.message ?? "Failed to reject application.");
    }
  };

  const handleBulkApprove = async () => {
    const pendingIds = filtered.filter((a) => a.status === "submitted").map((a) => String(a.id));
    if (pendingIds.length === 0) { toast.info("No submitted applications to approve."); return; }
    const res = await apiClient.bulkApproveApplications(pendingIds);
    if (res.success) {
      toast.success(res.message ?? "Applications approved.");
      fetchApplications();
    } else {
      toast.error(res.message ?? "Bulk approve failed.");
    }
  };

  const handleAssignSupervisor = async (appId: string, supervisorId: number) => {
    const app = applications.find((a) => String(a.id) === appId);
    const internshipId = app?.internship?.id ? String(app.internship.id) : null;
    if (!internshipId) {
      toast.error("No internship found for this application. Please activate the internship first.");
      setShowAssign(null);
      return;
    }
    const res = await apiClient.assignSupervisor(internshipId, supervisorId);
    if (res.success) {
      toast.success(res.message ?? "Supervisor assigned.");
      fetchApplications();
    } else {
      toast.error(res.message ?? "Failed to assign supervisor.");
    }
    setShowAssign(null);
  };

  const detail = selectedApp ? applications.find((a) => String(a.id) === selectedApp) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Applications</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {viewRole === "clo" ? "All departments" : `${user?.department ?? ""} Department`}
          </p>
        </div>
        <button
          onClick={handleBulkApprove}
          className="px-3 md:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <CheckCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Bulk Approve</span>
        </button>
        <button
          onClick={() =>
            exportToCSV(
              filtered.map((a) => ({
                Student: a.student?.user?.name ?? a.student?.name ?? a.studentName ?? "",
                ID: a.student?.student_id ?? a.studentId ?? "",
                Company: a.company?.name ?? a.companyName ?? "",
                Department: a.student?.department?.name ?? a.student?.department ?? a.department ?? "",
                Status: a.status,
                Date: a.created_at ?? a.dateApplied ?? "",
              })),
              "applications_export"
            )
          }
          className="px-3 md:px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-accent"
              }`}
              style={{ fontSize: "0.8rem" }}
            >
              {s === "All" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Mobile card list (hidden on desktop) ── */}
        <div className="lg:hidden space-y-3">
          {loading && (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border" style={{ fontSize: "0.85rem" }}>Loading applications…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border" style={{ fontSize: "0.85rem" }}>No applications found.</div>
          )}
          {!loading && filtered.map((app) => {
            const appId = String(app.id);
            const studentName = app.student?.user?.name ?? app.student?.name ?? app.studentName ?? "—";
            const studentNum = app.student?.student_id ?? app.studentId ?? "—";
            const companyName = app.company?.name ?? app.companyName ?? "—";
            const deptName = app.student?.department?.name ?? app.student?.department ?? app.department ?? "";
            return (
              <div
                key={appId}
                className={`bg-card border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/30 transition-colors ${selectedApp === appId ? "border-primary" : "border-border"}`}
                onClick={() => setSelectedApp(appId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ fontSize: "0.9rem" }}>{studentName}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{studentNum}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <p className="text-muted-foreground truncate" style={{ fontSize: "0.82rem" }}>🏢 {companyName}</p>
                {viewRole === "clo" && (
                  <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>{deptName}</p>
                )}
                {(viewRole === "dlo" && (app.status === "submitted" || app.status === "approved" || app.status === "company_accepted")) && (
                  <div className="flex gap-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                    {app.status === "submitted" && (
                      <>
                        <button onClick={() => handleApprove(appId)} className="flex-1 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center justify-center gap-1.5" style={{ fontSize: "0.82rem" }}>
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handleReject(appId)} className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center justify-center gap-1.5" style={{ fontSize: "0.82rem" }}>
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                    {(app.status === "approved" || app.status === "company_accepted") && (
                      <div className="relative w-full">
                        <button
                          onClick={() => setShowAssign(showAssign === appId ? null : appId)}
                          className="w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center justify-center gap-1.5"
                          style={{ fontSize: "0.82rem" }}
                        >
                          <UserPlus className="w-4 h-4" /> Assign Supervisor
                        </button>
                        {showAssign === appId && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAssign(null)} />
                            <div className="absolute left-0 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 p-2">
                              <p className="text-muted-foreground px-2 py-1" style={{ fontSize: "0.75rem" }}>Select Supervisor</p>
                              {academicSupervisors.length === 0 && <p className="px-2 py-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>No supervisors available</p>}
                              {academicSupervisors.map((sup) => (
                                <button key={sup.id} onClick={() => handleAssignSupervisor(appId, sup.id)} className="w-full text-left px-2 py-2 rounded hover:bg-accent" style={{ fontSize: "0.82rem" }}>
                                  {sup.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className="hidden lg:block bg-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <table className="w-full"><tbody><SkeletonTableRows rows={6} cols={6} /></tbody></table>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Student</th>
                    <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>ID</th>
                    <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Company</th>
                    {viewRole === "clo" && <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Dept</th>}
                    <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Status</th>
                    <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => {
                    const appId = String(app.id);
                    const studentName = app.student?.user?.name ?? app.student?.name ?? app.studentName ?? "—";
                    const studentNum = app.student?.student_id ?? app.studentId ?? "—";
                    const companyName = app.company?.name ?? app.companyName ?? "—";
                    const dept = (app.student?.department?.name ?? app.student?.department ?? app.department ?? "").split(" ")[0];
                    return (
                      <tr
                        key={appId}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedApp === appId ? "bg-secondary/50" : ""}`}
                        onClick={() => setSelectedApp(appId)}
                      >
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{studentName}</td>
                        <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>{studentNum}</td>
                        <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{companyName}</td>
                        {viewRole === "clo" && <td className="px-4 py-3" style={{ fontSize: "0.8rem" }}>{dept}</td>}
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {viewRole === "dlo" && app.status === "submitted" && (
                              <>
                                <button onClick={() => handleApprove(appId)} className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleReject(appId)} className="p-1.5 rounded-md hover:bg-red-100 text-red-600">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(app.status === "approved" || app.status === "company_accepted") && (
                              <div className="relative">
                                <button
                                  onClick={() => setShowAssign(showAssign === appId ? null : appId)}
                                  className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600"
                                >
                                  <UserPlus className="w-4 h-4" />
                                </button>
                                {showAssign === appId && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowAssign(null)} />
                                    <div className="absolute right-0 top-8 w-56 bg-card border border-border rounded-lg shadow-xl z-50 p-2">
                                      <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground px-2 py-1">Assign Supervisor</p>
                                      {academicSupervisors.length === 0 && (
                                        <p className="px-2 py-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>No supervisors available</p>
                                      )}
                                      {academicSupervisors.map((sup) => (
                                        <button
                                          key={sup.id}
                                          onClick={() => handleAssignSupervisor(appId, sup.id)}
                                          className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                                          style={{ fontSize: "0.8rem" }}
                                        >
                                          {sup.name}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={viewRole === "clo" ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                        No applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {detail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedApp(null)}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3>Application Details</h3>
                  <button onClick={() => setSelectedApp(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    ["Student", detail.student?.user?.name ?? detail.student?.name ?? detail.studentName ?? "—"],
                    ["Student ID", detail.student?.student_id ?? detail.studentId ?? "—"],
                    ["Department", detail.student?.department?.name ?? detail.student?.department ?? detail.department ?? "—"],
                    ["Company", detail.company?.name ?? detail.companyName ?? "—"],
                    ["Date Applied", detail.created_at ?? detail.dateApplied ?? "—"],
                    ["Type", detail.application_type ?? "individual"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">{label}</p>
                      <p style={{ fontSize: "0.85rem" }}>{val}</p>
                    </div>
                  ))}
                  <div>
                    <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Status</p>
                    <StatusBadge status={detail.status} />
                  </div>
                </div>
                <div className="pt-3 border-t border-border space-y-2">
                  {viewRole === "dlo" && detail.status === "submitted" && (
                    <>
                      <button onClick={() => { handleApprove(String(detail.id)); setSelectedApp(null); }} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90" style={{ fontSize: "0.85rem" }}>
                        Approve Application
                      </button>
                      <button onClick={() => { handleReject(String(detail.id)); setSelectedApp(null); }} className="w-full py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90" style={{ fontSize: "0.85rem" }}>
                        Reject Application
                      </button>
                    </>
                  )}
                  {viewRole === "dlo" && (detail.status === "approved" || detail.status === "company_accepted") && (
                    <div className="relative">
                      <button
                        onClick={() => { setShowAssign(showAssign === String(detail.id) ? null : String(detail.id)); }}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        style={{ fontSize: "0.85rem" }}
                      >
                        <UserPlus className="w-4 h-4" /> Assign Academic Supervisor
                      </button>
                      {showAssign === String(detail.id) && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAssign(null)} />
                          <div className="absolute left-0 bottom-full mb-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 p-2">
                            <p className="text-muted-foreground px-2 py-1" style={{ fontSize: "0.75rem" }}>Select Supervisor</p>
                            {academicSupervisors.length === 0 && <p className="px-2 py-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>No supervisors available</p>}
                            {academicSupervisors.map((sup) => (
                              <button key={sup.id} onClick={() => { handleAssignSupervisor(String(detail.id), sup.id); setSelectedApp(null); }}
                                className="w-full text-left px-2 py-2 rounded hover:bg-accent" style={{ fontSize: "0.82rem" }}>
                                {sup.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
