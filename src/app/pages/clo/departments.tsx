import { useEffect, useState, useMemo, useCallback } from "react";
import { departments as staticDepts } from "../../lib/mock-data";
import { apiClient } from "../../lib/api-client";
import { toast } from "sonner";
import {
  Building2, Plus, Edit2, UserCheck, UserPlus,
  Search, X, Layers, User, ChevronDown
} from "lucide-react";
import { SkeletonStatCards, SkeletonCardGrid } from "../../components/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: "active" | "inactive";
  hodName?: string;
  hodId?: string;
  dloName?: string;
  dloId?: string;
}

interface StaffOption {
  id: string;
  name: string;
  email: string;
  staffId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeDept(d: any, index: number): Department {
  // Backend now returns separate hod + dlo objects; department_head.user is legacy fallback.
  const legacyHead = d.department_head?.user ?? null;
  const legacyRole = legacyHead?.role ?? null;
  const hod = d.hod ?? (legacyRole === "hod" ? legacyHead : null);
  const dlo = d.dlo ?? (legacyRole === "dlo" ? legacyHead : null);
  return {
    id: String(d.id ?? `dept-${index}`),
    name: d.name ?? `Department ${index + 1}`,
    code: d.code ?? (d.name as string)?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 5) ?? `D${index + 1}`,
    description: d.description ?? undefined,
    contactEmail: d.contact_email ?? undefined,
    contactPhone: d.contact_phone ?? undefined,
    status: d.status === "inactive" ? "inactive" : "active",
    hodName: hod?.name ?? undefined,
    hodId: hod?.id ? String(hod.id) : undefined,
    dloName: dlo?.name ?? undefined,
    dloId: dlo?.id ? String(dlo.id) : undefined,
  };
}

function buildStaticDepts(): Department[] {
  return staticDepts.map((name, index) => {
    const code = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 5);
    return { id: `static-${index}`, name, code, status: "active" as const };
  });
}

const emptyForm = {
  name: "", code: "", description: "", contactEmail: "", contactPhone: "",
};

// ── Staff picker sub-component ─────────────────────────────────────────────────

function StaffPicker({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: StaffOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => options.filter(
      (o) =>
        o.name.toLowerCase().includes(query.toLowerCase()) ||
        o.email.toLowerCase().includes(query.toLowerCase())
    ),
    [options, query]
  );

  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-lg bg-background text-left"
        style={{ fontSize: "0.85rem" }}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email…"
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg"
                style={{ fontSize: "0.82rem" }}
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                  className="w-full text-left px-3 py-2 text-muted-foreground hover:bg-accent transition-colors"
                  style={{ fontSize: "0.82rem" }}
                >
                  — Clear selection
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-muted-foreground text-center" style={{ fontSize: "0.82rem" }}>
                No users found
              </li>
            )}
            {filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { onChange(o.id); setOpen(false); setQuery(""); }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors ${o.id === value ? "bg-primary/5 text-primary" : ""}`}
                  style={{ fontSize: "0.82rem" }}
                >
                  <p style={{ fontWeight: 500 }}>{o.name}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.74rem" }}>{o.email}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Edit department modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Assign staff modal
  const [assignTarget, setAssignTarget] = useState<Department | null>(null);
  const [hodOptions, setHodOptions] = useState<StaffOption[]>([]);
  const [dloOptions, setDloOptions] = useState<StaffOption[]>([]);
  const [assignHodId, setAssignHodId] = useState("");
  const [assignDloId, setAssignDloId] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // ── Load departments ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const res = await apiClient.getDepartments({ include_stats: true });
      if (!active) return;
      if (res.success && res.data.length > 0) {
        setDepts(res.data.map((d, i) => normalizeDept(d, i)));
      } else {
        setDepts(buildStaticDepts());
      }
      setLoading(false);
    };
    load().catch(() => {
      if (!active) return;
      setDepts(buildStaticDepts());
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // ── Load staff when assign modal opens ──────────────────────────────────────
  const openAssign = useCallback(async (dept: Department) => {
    setAssignTarget(dept);
    setAssignHodId(dept.hodId ?? "");
    setAssignDloId(dept.dloId ?? "");
    setStaffLoading(true);

    const [hodRes, dloRes] = await Promise.all([
      apiClient.getUsers({ role: "hod" }),
      apiClient.getUsers({ role: "dlo" }),
    ]);

    const toOption = (u: any): StaffOption => ({
      id: String(u.id),
      name: u.name ?? u.email,
      email: u.email ?? "",
      staffId: u.staff_id ?? u.staffId ?? undefined,
    });

    setHodOptions(hodRes.success ? hodRes.data.map(toOption) : []);
    setDloOptions(dloRes.success ? dloRes.data.map(toOption) : []);
    setStaffLoading(false);
  }, []);

  const handleAssignSave = async () => {
    if (!assignTarget) return;
    setAssigning(true);

    const payload: Record<string, unknown> = {};
    if (assignHodId) payload.hod_user_id = assignHodId;
    if (assignDloId) payload.dlo_user_id = assignDloId;

    const res = await apiClient.updateDepartment(assignTarget.id, payload);

    if (res.success) {
      const hodUser = hodOptions.find((u) => u.id === assignHodId);
      const dloUser = dloOptions.find((u) => u.id === assignDloId);
      setDepts((prev) => prev.map((d) =>
        d.id === assignTarget.id
          ? {
              ...d,
              hodName: hodUser?.name,
              hodId: hodUser?.id,
              dloName: dloUser?.name,
              dloId: dloUser?.id,
            }
          : d
      ));
      toast.success(`Staff assigned to ${assignTarget.name}.`);
      setAssignTarget(null);
    } else {
      toast.error(res.message ?? "Assignment failed.");
    }

    setAssigning(false);
  };

  // ── Dept form helpers ───────────────────────────────────────────────────────
  const filtered = useMemo(
    () => depts.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase())
    ),
    [depts, search]
  );

  const activeCount = depts.filter((d) => d.status === "active").length;
  const hodCount = depts.filter((d) => !!d.hodName).length;
  const dloCount = depts.filter((d) => !!d.dloName).length;

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      description: dept.description ?? "",
      contactEmail: dept.contactEmail ?? "",
      contactPhone: dept.contactPhone ?? "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Department name is required."); return; }
    if (!form.code.trim()) { toast.error("Short code is required."); return; }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.contactEmail.trim() ? { contact_email: form.contactEmail.trim() } : {}),
      ...(form.contactPhone.trim() ? { contact_phone: form.contactPhone.trim() } : {}),
    };

    if (editTarget) {
      const res = await apiClient.updateDepartment(editTarget.id, payload);
      if (res.success) {
        setDepts((prev) => prev.map((d) =>
          d.id === editTarget.id
            ? { ...d, name: payload.name, code: payload.code, description: payload.description, contactEmail: payload.contact_email, contactPhone: payload.contact_phone }
            : d
        ));
        toast.success(`${payload.name} updated.`);
      } else {
        toast.error(res.message ?? "Failed to update department.");
      }
    } else {
      const res = await apiClient.createDepartment(payload);
      if (res.success && res.data) {
        setDepts((prev) => [...prev, normalizeDept(res.data, prev.length)]);
        toast.success(`${payload.name} created.`);
      } else {
        toast.error(res.message ?? "Failed to create department.");
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditTarget(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Department Management</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading ? "Loading departments…" : `${depts.length} department${depts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {/* Stats */}
      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Departments", value: depts.length, icon: Building2, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
            { label: "Active", value: activeCount, icon: Layers, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
            { label: "HOD Assigned", value: hodCount, icon: UserCheck, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" },
            { label: "DLO Assigned", value: dloCount, icon: UserPlus, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</p>
                  <p style={{ fontSize: "1.35rem", fontWeight: 600, lineHeight: 1 }}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card"
          style={{ fontSize: "0.85rem" }}
        />
      </div>

      {/* Department cards */}
      {loading ? <SkeletonCardGrid cards={6} cols={2} /> : null}
      {!loading && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((dept) => (
          <div
            key={dept.id}
            className="bg-card rounded-2xl border border-border/50 p-5 hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-all duration-200"
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>{dept.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${dept.status === "active" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400"}`}
                    >
                      {dept.status}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono" style={{ fontSize: "0.72rem" }}>{dept.code}</span>
                  {dept.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2" style={{ fontSize: "0.78rem" }}>{dept.description}</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openAssign(dept)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                  title="Assign HOD / DLO"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openEdit(dept)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit department"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Staff row */}
            <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
              {/* HOD slot */}
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.6rem", fontWeight: 600 }}>HOD</p>
                  {dept.hodName
                    ? <p className="text-foreground truncate" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{dept.hodName}</p>
                    : <button onClick={() => openAssign(dept)} className="text-primary hover:underline" style={{ fontSize: "0.78rem" }}>Assign HOD</button>
                  }
                </div>
              </div>

              {/* DLO slot */}
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.6rem", fontWeight: 600 }}>DLO</p>
                  {dept.dloName
                    ? <p className="text-foreground truncate" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{dept.dloName}</p>
                    : <button onClick={() => openAssign(dept)} className="text-primary hover:underline" style={{ fontSize: "0.78rem" }}>Assign DLO</button>
                  }
                </div>
              </div>
            </div>

            {/* Contact row */}
            {(dept.contactEmail || dept.contactPhone) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {dept.contactEmail && (
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{dept.contactEmail}</span>
                )}
                {dept.contactPhone && (
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{dept.contactPhone}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div
            className="col-span-2 text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border/50"
            style={{ fontSize: "0.85rem" }}
          >
            No departments match your search.
          </div>
        )}
      </div>}

      {/* ── Assign Staff Modal ──────────────────────────────────────────────────── */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignTarget(null)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 style={{ fontSize: "1rem" }}>Assign Staff</h2>
                <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{assignTarget.name}</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffLoading ? (
              <div className="py-8 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                Loading staff…
              </div>
            ) : (
              <div className="space-y-4">
                {/* HOD picker */}
                <div>
                  <label className="flex items-center gap-2 mb-2" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                    Head of Department (HOD)
                  </label>
                  {hodOptions.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-2 border border-border rounded-lg bg-muted/30" style={{ fontSize: "0.82rem" }}>
                      No HOD users found
                    </p>
                  ) : (
                    <StaffPicker
                      options={hodOptions}
                      value={assignHodId}
                      onChange={setAssignHodId}
                      placeholder="Select a HOD…"
                    />
                  )}
                </div>

                {/* DLO picker */}
                <div>
                  <label className="flex items-center gap-2 mb-2" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    <User className="w-4 h-4 text-violet-500" />
                    Departmental Liaison Officer (DLO)
                  </label>
                  {dloOptions.length === 0 ? (
                    <p className="text-muted-foreground px-3 py-2 border border-border rounded-lg bg-muted/30" style={{ fontSize: "0.82rem" }}>
                      No DLO users found
                    </p>
                  ) : (
                    <StaffPicker
                      options={dloOptions}
                      value={assignDloId}
                      onChange={setAssignDloId}
                      placeholder="Select a DLO…"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setAssignTarget(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
                style={{ fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSave}
                disabled={assigning || staffLoading}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ fontSize: "0.85rem" }}
              >
                {assigning ? "Saving…" : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-md my-8 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2>{editTarget ? "Edit Department" : "Add Department"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-1" style={{ fontSize: "0.8rem" }}>
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Computer Science"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ fontSize: "0.8rem" }}>
                  Short Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 8) })}
                  placeholder="e.g., CS"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional — brief description of the department"
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>Contact Email</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="dept@htu.edu.gh"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-muted-foreground" style={{ fontSize: "0.8rem" }}>Contact Phone</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="+233..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
                style={{ fontSize: "0.85rem" }}
              >
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Department"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
