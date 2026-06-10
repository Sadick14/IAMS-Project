import { useState, useEffect, useCallback } from "react";
import { SkeletonTableRows } from "../../components/skeleton";
import { useAppContext } from "../../lib/context";
import {
  Zap, RefreshCw, Search, X, Users, AlertTriangle, CheckCircle2, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "../../lib/api-client";

interface PendingRow {
  internshipId: string;
  studentName: string;
  studentId: string;
  companyName: string;
  region: string;
  currentSupervisorId?: string;
  currentSupervisorName?: string;
}

interface SupervisorRow {
  id: string;
  name: string;
  currentLoad: number;
  maxLoad: number;
}

export function DLOAssignmentsPage() {
  const { user } = useAppContext();
  const department = user?.department || "";

  const [tab, setTab] = useState<"pending" | "assigned">("pending");
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [assigned, setAssigned] = useState<PendingRow[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorRow[]>([]);
  const [activeTermId, setActiveTermId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [autoRunning, setAutoRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pendingRes, assignedRes, supsRes, termRes] = await Promise.all([
      apiClient.getSupervisorAssignmentsPending({ per_page: 100, department }),
      apiClient.getSupervisorAssignmentsAssigned({ per_page: 100, department }),
      apiClient.getAvailableSupervisors({ department }),
      apiClient.getActiveTerm(),
    ]);
    if (pendingRes.success) {
      setPending(pendingRes.data.map((i: any) => ({
        internshipId: String(i.id),
        studentName: i.student?.user?.name ?? "—",
        studentId: i.student?.student_id ?? "—",
        companyName: i.company?.name ?? "—",
        region: i.company?.region ?? i.company?.city ?? "—",
      })));
    }
    if (assignedRes.success) {
      setAssigned(assignedRes.data.map((i: any) => ({
        internshipId: String(i.id),
        studentName: i.student?.user?.name ?? "—",
        studentId: i.student?.student_id ?? "—",
        companyName: i.company?.name ?? "—",
        region: i.company?.region ?? i.company?.city ?? "—",
        currentSupervisorId: i.academic_supervisor?.id ? String(i.academic_supervisor.id) : undefined,
        currentSupervisorName: i.academic_supervisor?.user?.name ?? "—",
      })));
    }
    if (supsRes.success) {
      setSupervisors(supsRes.data.map((s: any) => ({
        id: String(s.id),
        name: s.user?.name ?? s.name ?? "—",
        currentLoad: s.current_students ?? 0,
        maxLoad: s.max_students ?? 0,
      })));
    }
    if (termRes.success) setActiveTermId(termRes.data?.term?.id ?? termRes.data?.id ?? null);
    setLoading(false);
  }, [department]);

  useEffect(() => {
    load();
    // Refresh every 30 seconds to catch updates from other sessions
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const sourceList = tab === "pending" ? pending : assigned;
  const filtered = sourceList.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.studentName.toLowerCase().includes(q) || e.studentId.toLowerCase().includes(q) || e.companyName.toLowerCase().includes(q);
  });

  const isReassigning = tab === "assigned";

  const selectedEntry = sourceList.find((x) => x.internshipId === assignFor);
  const supervisorOptions: SupervisorRow[] =
    selectedEntry?.currentSupervisorId && !supervisors.some((s) => s.id === selectedEntry.currentSupervisorId)
      ? [...supervisors, { id: selectedEntry.currentSupervisorId, name: selectedEntry.currentSupervisorName ?? "—", currentLoad: -1, maxLoad: -1 }]
      : supervisors;

  const handleAssign = async () => {
    if (!assignFor || !assignTo) return;
    setRefreshing(true);
    try {
      const res = await apiClient.assignSupervisor(assignFor, Number(assignTo));
      if (res.success) {
        toast.success(res.message ?? (isReassigning ? "Supervisor reassigned." : "Supervisor assigned."));
        setAssignFor(null);
        setAssignTo("");
        // Refresh immediately to show updated list
        await load();
      } else {
        toast.error(res.message ?? "Failed to assign supervisor.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      toast.success("Data refreshed.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAutoAssign = async () => {
    if (!activeTermId) { toast.error("No active term found for auto-assignment."); return; }
    setAutoRunning(true);
    const res = await apiClient.autoAssignSupervisors({ term_id: activeTermId });
    setAutoRunning(false);
    if (res.success) {
      toast.success(res.message ?? "Auto-assignment complete.");
      load();
    } else {
      toast.error(res.message ?? "Auto-assignment failed.");
    }
  };

  const totalPending = pending.length;
  const totalAssigned = assigned.length;
  const totalCapacity = supervisors.reduce((s, x) => s + Math.max(0, x.maxLoad - x.currentLoad), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1>Supervisor Assignments</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Assign academic supervisors to internships awaiting placement.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleManualRefresh} disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50" style={{ fontSize: "0.85rem" }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {!refreshing && "Refresh"}
          </button>
          <button onClick={handleAutoAssign} disabled={autoRunning || totalPending === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.85rem" }}>
            {autoRunning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Assigning…</> : <><Zap className="w-4 h-4" /> Run Auto-Assignment</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Awaiting Assignment" value={totalPending} icon={<AlertTriangle className="w-4 h-4" />} tone="amber" />
        <Stat label="Already Assigned" value={totalAssigned} icon={<CheckCircle2 className="w-4 h-4" />} tone="default" />
        <Stat label="Available Supervisors" value={supervisors.length} icon={<Users className="w-4 h-4" />} tone="default" />
        <Stat label="Open Slots" value={totalCapacity} icon={<CheckCircle2 className="w-4 h-4" />} tone="emerald" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {([
          { key: "pending", label: `Awaiting Assignment (${totalPending})` },
          { key: "assigned", label: `Assigned (${totalAssigned})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 -mb-px border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            style={{ fontSize: "0.85rem" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, ID, or company..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
        </div>
      </div>

      {/* Assignment table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                {(isReassigning ? ["Student", "Company", "Region", "Current Supervisor", "Action"] : ["Student", "Company", "Region", "Action"]).map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-muted-foreground" style={{ fontSize: "0.7rem" }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={5} cols={isReassigning ? 5 : 4} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isReassigning ? 5 : 4} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                  {sourceList.length === 0
                    ? (isReassigning ? "No internships have a supervisor assigned yet." : "All internships have supervisors assigned.")
                    : "No students match your search."}
                </td></tr>
              ) : filtered.map((e) => (
                <tr key={e.internshipId} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p style={{ fontSize: "0.85rem" }}>{e.studentName}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{e.studentId}</p>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.8rem" }}>{e.companyName}</td>
                  <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>{e.region}</td>
                  {isReassigning && (
                    <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>{e.currentSupervisorName}</td>
                  )}
                  <td className="px-4 py-3">
                    <button onClick={() => { setAssignFor(e.internshipId); setAssignTo(e.currentSupervisorId ?? ""); }}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90" style={{ fontSize: "0.8rem" }}>
                      {isReassigning ? "Reassign" : "Assign"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual assign / reassign modal */}
      {assignFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAssignFor(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2>{isReassigning ? "Reassign Supervisor" : "Assign Supervisor"}</h2>
              <button onClick={() => setAssignFor(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            {(() => {
              const e = sourceList.find((x) => x.internshipId === assignFor);
              if (!e) return null;
              return (
                <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                  Student: <strong className="text-foreground">{e.studentName}</strong> · {e.companyName}
                  {isReassigning && e.currentSupervisorName && (
                    <> · Currently: <strong className="text-foreground">{e.currentSupervisorName}</strong></>
                  )}
                </p>
              );
            })()}
            <div>
              <label style={{ fontSize: "0.8rem" }}>Supervisor</label>
              <div className="relative mt-1">
                <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-9 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }}>
                  <option value="">Select supervisor...</option>
                  {supervisorOptions.map((s) => {
                    const isCurrent = isReassigning && s.id === selectedEntry?.currentSupervisorId;
                    if (s.currentLoad < 0) {
                      return <option key={s.id} value={s.id}>{s.name} (current)</option>;
                    }
                    const full = s.currentLoad >= s.maxLoad;
                    return <option key={s.id} value={s.id} disabled={full && !isCurrent}>{s.name} — {s.currentLoad}/{s.maxLoad}{full ? (isCurrent ? " (current)" : " (full)") : ""}</option>;
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAssignFor(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={handleAssign} disabled={!assignTo}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.85rem" }}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "default" | "emerald" | "amber" }) {
  const toneCls = tone === "emerald" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-secondary/40 text-muted-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.65rem" }}>{label}</p>
        <span className={`p-1.5 rounded ${toneCls}`}>{icon}</span>
      </div>
      <p className="mt-1" style={{ fontSize: "1.4rem" }}>{value}</p>
    </div>
  );
}
