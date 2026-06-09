import { useEffect, useState, useCallback } from "react";
import { SkeletonTableRows } from "../../components/skeleton";
import { Shield, Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, User, Eye } from "lucide-react";
import { exportToCSV } from "../../lib/csv-export";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";

const actionColors: Record<string, string> = {
  // Users
  "User Created":           "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "User Updated":           "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Role Changed":           "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "User Activated":         "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "User Deactivated":       "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Companies
  "Company Approved":       "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  "Company Rejected":       "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Applications
  "Application Approved":   "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "Application Rejected":   "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  // Internships
  "Internship Activated":   "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Internship Completed":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Internship Terminated":  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "Supervisor Assigned":    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  // Terms
  "Term Created":           "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Term Archived":          "bg-gray-200 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  // Grades
  "Grade Approved":         "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Grade Published":        "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Logbooks
  "Logbook Approved":       "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  "Logbook Rejected":       "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  // Assessments & Invitations
  "Assessment Approved":    "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  "Invitation Accepted":    "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
};

const PAGE_SIZE = 10;

type AuditLogItem = {
  id: string;
  timestamp: string;
  user: string;
  userId: string | null;
  action: string;
  modelType: string;
  modelId: string | null;
  description: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  tags: string | null;
};

function normalizeAuditLogs(logs: any[]): AuditLogItem[] {
  return logs.map((log, index) => ({
    id: String(log.id ?? `audit-${index}`),
    timestamp: log.created_at ?? log.timestamp ?? new Date().toISOString(),
    user: log.user?.name ?? log.user_name ?? "System",
    userId: log.user_id ? String(log.user_id) : null,
    action: log.action ?? "Updated",
    modelType: (log.auditable_type ?? "Record").split("\\").pop() ?? "Record",
    modelId: log.auditable_id ? String(log.auditable_id) : null,
    description: log.description ?? log.details ?? "No additional details.",
    oldValues: log.old_values ?? null,
    newValues: log.new_values ?? null,
    ipAddress: log.ip_address ?? null,
    tags: log.tags ?? null,
  }));
}

const ALL_ACTIONS = Object.keys(actionColors).sort();

export function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  useEffect(() => {
    apiClient.getUsers().then((res) => {
      if (res.success) {
        setAllUsers(
          [...res.data]
            .map((u: any) => u.name as string)
            .filter(Boolean)
            .sort()
        );
      }
    });
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    // Only date range is sent to the server to narrow the dataset.
    // Action, user, and text search are filtered client-side so the
    // filter dropdowns always show the full set of available values.
    // When no date range is set we fetch all records; when a date range
    // is applied the dataset is already narrow so 500 is a safe cap.
    const filters: Record<string, unknown> = {};
    if (dateFrom) { filters.from = dateFrom; filters.per_page = 500; }
    if (dateTo)   { filters.to   = dateTo;   filters.per_page = 500; }
    if (!dateFrom && !dateTo) filters.per_page = 10000;

    const response = await apiClient.getAuditLogs(filters);
    if (response.success) {
      setLogs(normalizeAuditLogs(response.data));
    } else {
      setLogs([]);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadLogs().catch(() => setLoading(false));
  }, [loadLogs]);

  const filtered = logs.filter((log) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !log.user.toLowerCase().includes(q) &&
        !log.action.toLowerCase().includes(q) &&
        !log.modelType.toLowerCase().includes(q) &&
        !log.description.toLowerCase().includes(q)
      ) return false;
    }
    if (actionFilter !== "All" && log.action !== actionFilter) return false;
    if (userFilter   !== "All" && log.user   !== userFilter)   return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const getActionColor = (action: string) =>
    actionColors[action] ?? "bg-secondary text-secondary-foreground";

  const clearFilters = () => {
    setSearch(""); setActionFilter("All"); setUserFilter("All");
    setDateFrom(""); setDateTo(""); setPage(0);
  };

  const hasFilters = search || actionFilter !== "All" || userFilter !== "All" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Audit Logs</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading
              ? "Loading audit logs…"
              : `All system actions · ${filtered.length.toLocaleString()} records`}
          </p>
        </div>
        <button
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
          onClick={() => {
            exportToCSV(
              filtered.map((l) => ({
                Timestamp:   l.timestamp,
                User:        l.user,
                Action:      l.action,
                "Model Type": l.modelType,
                "Model ID":  l.modelId ?? "",
                Description: l.description,
                "IP Address": l.ipAddress ?? "",
              })),
              "audit_logs"
            );
            toast.success("Audit logs exported!");
          }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user, action, description…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Actions</option>
            {ALL_ACTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Users</option>
            {allUsers.map((u) => <option key={u}>{u}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
                placeholder="From"
              />
            </div>
            <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                className="pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
                placeholder="To"
              />
            </div>
          </div>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-primary hover:underline flex items-center gap-1"
            style={{ fontSize: "0.8rem" }}
          >
            <Filter className="w-3.5 h-3.5" /> Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Timestamp</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>User</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Action</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Resource</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Description</th>
                <th className="px-4 py-3" style={{ fontSize: "0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={8} cols={6} />}
              {!loading && paged.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 ${selectedLog === log.id ? "bg-primary/5" : ""}`}
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" style={{ fontSize: "0.8rem" }}>
                    <p>{new Date(log.timestamp).toLocaleDateString()}</p>
                    <p style={{ fontSize: "0.7rem" }}>{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {log.user}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${getActionColor(log.action)}`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      <Shield className="w-3 h-3" />{log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" style={{ fontSize: "0.8rem" }}>
                    {log.modelType}{log.modelId ? ` #${log.modelId}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate" style={{ fontSize: "0.8rem" }}>
                    {log.description}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    {logs.length === 0
                      ? "No audit logs recorded yet. Actions will appear here as users interact with the system."
                      : "No logs match your current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selectedLog && (() => {
          const log = logs.find((l) => l.id === selectedLog);
          if (!log) return null;
          return (
            <div className="border-t border-border bg-muted/20 p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Log ID</p>
                  <p style={{ fontSize: "0.85rem" }}>#{log.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Timestamp</p>
                  <p style={{ fontSize: "0.85rem" }}>{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Performed By</p>
                  <p style={{ fontSize: "0.85rem" }}>{log.user}</p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>IP Address</p>
                  <p style={{ fontSize: "0.85rem" }}>{log.ipAddress ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Description</p>
                <p style={{ fontSize: "0.85rem" }}>{log.description}</p>
              </div>
              {(log.oldValues || log.newValues) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {log.oldValues && (
                    <div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Before</p>
                      <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-red-800 dark:text-red-300 overflow-x-auto" style={{ fontSize: "0.75rem" }}>
                        {JSON.stringify(log.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.newValues && (
                    <div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>After</p>
                      <pre className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 text-emerald-800 dark:text-emerald-300 overflow-x-auto" style={{ fontSize: "0.75rem" }}>
                        {JSON.stringify(log.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {log.tags && (
                <div>
                  <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Tags</p>
                  <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground" style={{ fontSize: "0.75rem" }}>{log.tags}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            {filtered.length === 0
              ? "0 records"
              : `Showing ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : safePage <= 3 ? i : safePage >= totalPages - 4 ? totalPages - 7 + i : safePage - 3 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-md ${safePage === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  style={{ fontSize: "0.8rem" }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
