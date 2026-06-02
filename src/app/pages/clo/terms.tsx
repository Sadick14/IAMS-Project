import { useEffect, useState, useMemo } from "react";
import { StatusBadge } from "../../components/status-badge";
import { ProgramPicker } from "../../components/program-picker";
import { departments as staticDepts, programsByDepartment } from "../../lib/mock-data";
import { apiClient } from "../../lib/api-client";
import type { TermDashboardResponse } from "../../types/api";
import {
  Plus, Calendar, Archive, Eye, X, Play, Edit2, CheckCircle2,
  Clock, FileText, GraduationCap, BookMarked, Layers, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TermShape {
  id: string;
  name: string;
  type: "Vacation" | "Semestrial";
  status: "Upcoming" | "Active" | "Completed" | "Archived";
  applicationStart: string;
  applicationEnd: string;
  internshipStart: string;
  internshipEnd: string;
  eligibleLevels: string[];
  departments: string[];
  programs?: string[];
}

interface DeptOption {
  name: string;
  code: string;
  hndCount: number;
  btechCount: number;
  otherCount: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeTerm(t: any, index: number): TermShape {
  return {
    id: String(t.id ?? `term-${index}`),
    name: t.name ?? `Term ${index + 1}`,
    type: t.type ?? "Semestrial",
    status: t.status ?? "Upcoming",
    applicationStart: t.application_start ?? t.applicationStart ?? "",
    applicationEnd: t.application_end ?? t.applicationEnd ?? "",
    internshipStart: t.internship_start ?? t.internshipStart ?? "",
    internshipEnd: t.internship_end ?? t.internshipEnd ?? "",
    eligibleLevels: t.eligible_levels ?? t.eligibleLevels ?? [],
    departments: (t.departments ?? []).map((d: any) =>
      typeof d === "string" ? d : d.name ?? String(d)
    ),
    programs: t.programs ?? [],
  };
}

function buildDeptOptions(apiDepts: any[]): DeptOption[] {
  const source = apiDepts.length > 0 ? apiDepts : staticDepts.map((name) => ({ name }));
  return source.map((d: any) => {
    const name: string = typeof d === "string" ? d : (d.name ?? "");
    const programs: string[] = Array.isArray(d.programs)
      ? d.programs.map((p: any) => (typeof p === "string" ? p : p.name))
      : (programsByDepartment[name] ?? []);
    const code = d.code ?? name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 5);
    return {
      name,
      code,
      hndCount: programs.filter((p) => /^HND\b/i.test(p)).length,
      btechCount: programs.filter((p) => /^BTech\b/i.test(p)).length,
      otherCount: programs.filter((p) => !/^(HND|BTech)\b/i.test(p)).length,
    };
  });
}

const LEVEL_OPTIONS = ["L100", "L200", "L300", "L400"];

const emptyForm = {
  name: "", type: "Semestrial" as "Semestrial" | "Vacation",
  applicationStart: "", applicationEnd: "",
  internshipStart: "", internshipEnd: "",
  levels: ["L300"] as string[],
  selectedDepts: [] as string[],
  programs: [] as string[],
};

// ── Component ──────────────────────────────────────────────────────────────────

export function TermsPage() {
  const [terms, setTerms] = useState<TermShape[]>([]);
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<TermShape | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermShape | null>(null);
  const [termDashboard, setTermDashboard] = useState<TermDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // ── Load term dashboard when detail modal opens ────────────────────────────────

  useEffect(() => {
    if (!selectedTerm) { setTermDashboard(null); return; }
    let active = true;
    setDashboardLoading(true);
    apiClient.getTermDashboard(selectedTerm.id).then((res) => {
      if (!active) return;
      setTermDashboard(res.success ? res.data : null);
      setDashboardLoading(false);
    }).catch(() => {
      if (!active) return;
      setDashboardLoading(false);
    });
    return () => { active = false; };
  }, [selectedTerm?.id]);

  // ── Load data ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [termsRes, deptsRes] = await Promise.all([
        apiClient.getTerms(),
        apiClient.getDepartments(),
      ]);
      if (!active) return;
      if (termsRes.success && termsRes.data.length > 0) {
        setTerms(termsRes.data.map(normalizeTerm));
      }
      setDeptOptions(buildDeptOptions(deptsRes.success ? deptsRes.data : []));
      setLoading(false);
    };
    load().catch(() => {
      if (!active) return;
      setDeptOptions(buildDeptOptions([]));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // ── Modal helpers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...emptyForm, selectedDepts: deptOptions.map((d) => d.name) });
    setShowModal(true);
  };

  const openEdit = (term: TermShape) => {
    setEditTarget(term);
    setForm({
      name: term.name, type: term.type,
      applicationStart: term.applicationStart, applicationEnd: term.applicationEnd,
      internshipStart: term.internshipStart, internshipEnd: term.internshipEnd,
      levels: term.eligibleLevels.length > 0 ? term.eligibleLevels : ["L300"],
      selectedDepts: term.departments,
      programs: term.programs ?? [],
    });
    setShowModal(true);
  };

  const toggleDept = (name: string) => {
    const next = form.selectedDepts.includes(name)
      ? form.selectedDepts.filter((d) => d !== name)
      : [...form.selectedDepts, name];
    const allowed = new Set(next.flatMap((d) => programsByDepartment[d] ?? []));
    setForm({ ...form, selectedDepts: next, programs: form.programs.filter((p) => allowed.has(p)) });
  };

  const toggleLevel = (level: string) => {
    const next = form.levels.includes(level)
      ? form.levels.filter((l) => l !== level)
      : [...form.levels, level];
    setForm({ ...form, levels: next });
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Term name is required."); return; }
    if (form.selectedDepts.length === 0) { toast.error("Select at least one department."); return; }

    setSaving(true);
    const payload = {
      name: form.name.trim(), type: form.type,
      applicationStart: form.applicationStart, applicationEnd: form.applicationEnd,
      internshipStart: form.internshipStart, internshipEnd: form.internshipEnd,
      eligibleLevels: form.levels, departments: form.selectedDepts,
    };

    if (editTarget) {
      await apiClient.updateTerm(editTarget.id, payload);
      setTerms((prev) => prev.map((t) =>
        t.id === editTarget.id ? { ...t, ...payload, programs: form.programs } : t
      ));
      toast.success("Term updated.");
    } else {
      const res = await apiClient.createTerm(payload);
      const newTerm: TermShape =
        res.success && res.data
          ? normalizeTerm(res.data, terms.length)
          : { id: `local-${Date.now()}`, status: "Upcoming", programs: form.programs, ...payload };
      setTerms((prev) => [...prev, newTerm]);
      toast.success("Term created.");
    }

    setSaving(false);
    setShowModal(false);
    setEditTarget(null);
  };

  // ── Status actions ─────────────────────────────────────────────────────────────

  const handleActivate = async (term: TermShape) => {
    await apiClient.publishTerm(term.id);
    const updated: TermShape = { ...term, status: "Active" };
    setTerms((prev) => prev.map((t) => {
      if (t.id === term.id) return updated;
      if (t.status === "Active") return { ...t, status: "Completed" as const };
      return t;
    }));
    if (selectedTerm?.id === term.id) setSelectedTerm(updated);
    toast.success(`${term.name} activated.`);
  };

  const handleArchive = async (term: TermShape) => {
    await apiClient.archiveTerm(term.id);
    const updated: TermShape = { ...term, status: "Archived" };
    setTerms((prev) => prev.map((t) => t.id === term.id ? updated : t));
    if (selectedTerm?.id === term.id) setSelectedTerm(updated);
    toast.success(`${term.name} archived.`);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const sortedTerms = useMemo(() => [...terms].sort((a, b) => {
    const order: Record<string, number> = { Active: 0, Upcoming: 1, Completed: 2, Archived: 3 };
    return (order[a.status] ?? 99) - (order[b.status] ?? 99);
  }), [terms]);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Term Management</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading
              ? "Loading terms…"
              : `${terms.length} term${terms.length !== 1 ? "s" : ""} · configure internship periods and eligibility`}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-card border border-border rounded-xl overflow-hidden">
            {(["cards", "timeline"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-2 capitalize transition-colors ${viewMode === m ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                style={{ fontSize: "0.8rem" }}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <Plus className="w-4 h-4" /> Create Term
          </button>
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: "Active", value: terms.filter((t) => t.status === "Active").length, icon: Play, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Upcoming", value: terms.filter((t) => t.status === "Upcoming").length, icon: Clock, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
          { label: "Completed", value: terms.filter((t) => t.status === "Completed").length, icon: CheckCircle2, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
          { label: "Archived", value: terms.filter((t) => t.status === "Archived").length, icon: Archive, color: "text-gray-500 bg-gray-100 dark:bg-gray-500/10" },
        ] as const).map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
              <p style={{ fontSize: "1.35rem", fontWeight: 600, lineHeight: 1 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Timeline View ────────────────────────────────────────────────────────── */}
      {viewMode === "timeline" ? (
        <div className="bg-card rounded-2xl p-5 space-y-3">
          <h3>Term Timeline</h3>
          {sortedTerms.length === 0 && (
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No terms yet. Create one to get started.</p>
          )}
          {sortedTerms.map((t) => (
            <div
              key={t.id}
              className="border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTerm(t)}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    t.status === "Active" ? "bg-emerald-500" :
                    t.status === "Upcoming" ? "bg-cyan-500" :
                    t.status === "Completed" ? "bg-violet-500" : "bg-gray-400"
                  }`} />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.name}</span>
                  <StatusBadge status={t.status} />
                </div>
                <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{t.type}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Application", `${t.applicationStart || "—"} → ${t.applicationEnd || "—"}`],
                  ["Internship", `${t.internshipStart || "—"} → ${t.internshipEnd || "—"}`],
                  ["Levels", t.eligibleLevels.join(", ") || "—"],
                  ["Departments", t.departments.length === deptOptions.length && deptOptions.length > 0
                    ? "All" : `${t.departments.length} dept${t.departments.length !== 1 ? "s" : ""}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{label}</p>
                    <p style={{ fontSize: "0.8rem" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Cards View ──────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTerms.map((t) => (
            <div
              key={t.id}
              className="bg-card rounded-2xl p-5 space-y-3 hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }} className="truncate">{t.name}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="space-y-1.5">
                {([
                  ["Type", t.type],
                  ["Application", t.applicationStart ? `${t.applicationStart} → ${t.applicationEnd}` : "—"],
                  ["Internship", t.internshipStart ? `${t.internshipStart} → ${t.internshipEnd}` : "—"],
                  ["Levels", t.eligibleLevels.join(", ") || "—"],
                  ["Departments", t.departments.length === deptOptions.length && deptOptions.length > 0
                    ? "All" : `${t.departments.length} of ${deptOptions.length}`],
                ] as const).map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.75rem" }}>{l}</span>
                    <span className="text-right" style={{ fontSize: "0.75rem" }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => setSelectedTerm(t)}
                  className="flex-1 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-1 text-muted-foreground transition-colors"
                  style={{ fontSize: "0.8rem" }}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="py-1.5 px-3 border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                  title="Edit term"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {t.status === "Upcoming" && (
                  <button
                    onClick={() => handleActivate(t)}
                    className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-1 transition-opacity"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Play className="w-3.5 h-3.5" /> Activate
                  </button>
                )}
                {(t.status === "Completed" || t.status === "Active") && (
                  <button
                    onClick={() => handleArchive(t)}
                    className="flex-1 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-1 text-muted-foreground transition-colors"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </button>
                )}
              </div>
            </div>
          ))}

          {sortedTerms.length === 0 && !loading && (
            <div className="col-span-3 text-center py-14 text-muted-foreground bg-card rounded-2xl" style={{ fontSize: "0.85rem" }}>
              No terms yet. Click "Create Term" to add one.
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8 p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2>{editTarget ? "Edit Term" : "Create New Term"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Basic info ─────────────────────────────────────────────────────── */}
            <section className="space-y-4">
              <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                Basic Info
              </p>
              <div>
                <label className="block mb-1" style={{ fontSize: "0.8rem" }}>
                  Term Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., 2026 L300 Semestrial Internship"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: "0.8rem" }}>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "Semestrial" | "Vacation" })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                >
                  <option value="Semestrial">Semestrial</option>
                  <option value="Vacation">Vacation</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Application Opens</label>
                  <input type="date" value={form.applicationStart}
                    onChange={(e) => setForm({ ...form, applicationStart: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Application Closes</label>
                  <input type="date" value={form.applicationEnd}
                    onChange={(e) => setForm({ ...form, applicationEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Internship Starts</label>
                  <input type="date" value={form.internshipStart}
                    onChange={(e) => setForm({ ...form, internshipStart: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.75rem" }}>Internship Ends</label>
                  <input type="date" value={form.internshipEnd}
                    onChange={(e) => setForm({ ...form, internshipEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                </div>
              </div>
            </section>

            {/* ── Eligible Levels ────────────────────────────────────────────────── */}
            <section className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                  Eligible Levels
                </p>
                <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  {form.levels.length === LEVEL_OPTIONS.length ? "All levels" : `${form.levels.length} selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setForm({ ...form, levels: form.levels.length === LEVEL_OPTIONS.length ? [] : [...LEVEL_OPTIONS] })}
                  className={`px-4 py-2 rounded-lg border transition-colors ${form.levels.length === LEVEL_OPTIONS.length ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                  style={{ fontSize: "0.82rem" }}
                >
                  All
                </button>
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      form.levels.includes(level) && form.levels.length !== LEVEL_OPTIONS.length
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    }`}
                    style={{ fontSize: "0.82rem" }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Department Selection ──────────────────────────────────────────────── */}
            <section className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                    Eligible Departments
                  </p>
                  <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>
                    {form.selectedDepts.length === 0
                      ? "No departments selected"
                      : form.selectedDepts.length === deptOptions.length
                        ? "All departments selected"
                        : `${form.selectedDepts.length} of ${deptOptions.length} selected`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({ ...form, selectedDepts: deptOptions.map((d) => d.name) })}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setForm({ ...form, selectedDepts: [], programs: [] })}
                    className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                    style={{ fontSize: "0.78rem" }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Department checkbox cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deptOptions.map((dept) => {
                  const selected = form.selectedDepts.includes(dept.name);
                  return (
                    <button
                      key={dept.name}
                      onClick={() => toggleDept(dept.name)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150 ${
                        selected
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox indicator */}
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {selected && (
                            <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span style={{ fontWeight: 600, fontSize: "0.85rem" }} className="truncate">{dept.name}</span>
                            <span
                              className={`font-mono shrink-0 px-1.5 py-0.5 rounded ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                              style={{ fontSize: "0.62rem" }}
                            >
                              {dept.code}
                            </span>
                          </div>
                          {/* Programme type badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {dept.hndCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" style={{ fontSize: "0.68rem" }}>
                                <GraduationCap className="w-2.5 h-2.5" /> {dept.hndCount} HND
                              </span>
                            )}
                            {dept.btechCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" style={{ fontSize: "0.68rem" }}>
                                <BookMarked className="w-2.5 h-2.5" /> {dept.btechCount} BTech
                              </span>
                            )}
                            {dept.otherCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-300" style={{ fontSize: "0.68rem" }}>
                                <Layers className="w-2.5 h-2.5" /> {dept.otherCount} Other
                              </span>
                            )}
                            {dept.hndCount === 0 && dept.btechCount === 0 && dept.otherCount === 0 && (
                              <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>No programmes configured</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Restrict to Specific Programmes ──────────────────────────────────── */}
            {form.selectedDepts.length > 0 && (
              <section className="space-y-3 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                    Restrict to Specific Programmes
                  </p>
                  <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                    {form.programs.length === 0 ? "All programmes in selected depts" : `${form.programs.length} pinned`}
                  </span>
                </div>
                <ProgramPicker
                  selectedDepartments={form.selectedDepts}
                  selectedPrograms={form.programs}
                  onChange={(programs) => setForm({ ...form, programs })}
                />
              </section>
            )}

            {/* ── Actions ─────────────────────────────────────────────────────────── */}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                style={{ fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ fontSize: "0.85rem" }}
              >
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Term"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Term Detail Modal ─────────────────────────────────────────────────────── */}
      {selectedTerm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTerm(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h2>{selectedTerm.name}</h2>
                  <div className="mt-1"><StatusBadge status={selectedTerm.status} /></div>
                </div>
              </div>
              <button onClick={() => setSelectedTerm(null)} className="p-1.5 rounded-lg hover:bg-accent shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Type", selectedTerm.type],
                ["Eligible Levels", selectedTerm.eligibleLevels.join(", ") || "—"],
                ["Application Period", `${selectedTerm.applicationStart || "—"} → ${selectedTerm.applicationEnd || "—"}`],
                ["Internship Period", `${selectedTerm.internshipStart || "—"} → ${selectedTerm.internshipEnd || "—"}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-muted/30 rounded-xl p-3">
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{label}</p>
                  <p style={{ fontSize: "0.88rem" }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Participating departments */}
            <div>
              <p className="text-muted-foreground mb-2 uppercase tracking-widest" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                Participating Departments ({selectedTerm.departments.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTerm.departments.length === 0 ? (
                  <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>None specified</span>
                ) : selectedTerm.departments.map((d) => {
                  const opt = deptOptions.find((o) => o.name === d);
                  return (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary rounded-full"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      {d}
                      {opt && (opt.hndCount > 0 || opt.btechCount > 0) && (
                        <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                          ({[opt.hndCount > 0 && `${opt.hndCount}H`, opt.btechCount > 0 && `${opt.btechCount}B`].filter(Boolean).join("/")})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Term statistics from API */}
            {dashboardLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-4 animate-pulse h-20" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Total Applications",
                      value: termDashboard?.total_applications ?? "—",
                      icon: FileText,
                      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
                    },
                    {
                      label: "Active Internships",
                      value: termDashboard?.active_internships ?? "—",
                      icon: GraduationCap,
                      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
                    },
                    {
                      label: "Completed",
                      value: termDashboard?.completed_internships ?? "—",
                      icon: CheckCircle2,
                      color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10",
                    },
                    {
                      label: "Placement Rate",
                      value: termDashboard?.placement_rate != null
                        ? `${Math.round(termDashboard.placement_rate)}%`
                        : "—",
                      icon: TrendingUp,
                      color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
                    },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} rounded-xl p-4`}>
                      <s.icon className="w-4 h-4 mb-1.5" />
                      <p style={{ fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: "0.68rem" }} className="opacity-70 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Department breakdown */}
                {termDashboard?.department_breakdown && termDashboard.department_breakdown.length > 0 && (
                  <div className="bg-muted/20 rounded-xl p-4 space-y-2">
                    <p className="text-muted-foreground uppercase tracking-widest mb-3" style={{ fontSize: "0.62rem", fontWeight: 600 }}>
                      Department Breakdown
                    </p>
                    {termDashboard.department_breakdown.map((row) => {
                      const pct = row.total > 0 ? Math.round((row.active / row.total) * 100) : 0;
                      return (
                        <div key={row.department} className="flex items-center gap-3">
                          <span className="w-36 truncate shrink-0" style={{ fontSize: "0.78rem" }}>{row.department}</span>
                          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-muted-foreground w-16 text-right shrink-0" style={{ fontSize: "0.72rem" }}>
                            {row.active}/{row.total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending / rejected summary */}
                {termDashboard && (termDashboard.pending_applications > 0 || termDashboard.rejected_applications > 0) && (
                  <div className="flex gap-3">
                    {termDashboard.pending_applications > 0 && (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span style={{ fontSize: "0.8rem" }} className="text-amber-700 dark:text-amber-400">
                          {termDashboard.pending_applications} pending
                        </span>
                      </div>
                    )}
                    {termDashboard.rejected_applications > 0 && (
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
                        <X className="w-4 h-4 text-red-600 shrink-0" />
                        <span style={{ fontSize: "0.8rem" }} className="text-red-700 dark:text-red-400">
                          {termDashboard.rejected_applications} rejected
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                onClick={() => { setSelectedTerm(null); openEdit(selectedTerm); }}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
                style={{ fontSize: "0.85rem" }}
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              {selectedTerm.status === "Upcoming" && (
                <button
                  onClick={() => { handleActivate(selectedTerm); setSelectedTerm(null); }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Play className="w-4 h-4" /> Activate
                </button>
              )}
              {(selectedTerm.status === "Completed" || selectedTerm.status === "Active") && (
                <button
                  onClick={() => { handleArchive(selectedTerm); setSelectedTerm(null); }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Archive className="w-4 h-4" /> Archive
                </button>
              )}
              <button onClick={() => setSelectedTerm(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
