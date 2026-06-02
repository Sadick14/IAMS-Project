import { SkeletonStatCards, SkeletonCardGrid } from "../../components/skeleton";
import { exportToCSV } from "../../lib/csv-export";
import type { ExtendedRole } from "../../services/auth-service";
import type { BranchResponse, CreateBranchRequest } from "../../types/api";
import { useAppContext } from "../../lib/context";
import { ghanaRegions } from "../../lib/mock-data";
import {
  Search, CheckCircle2, XCircle, Building2, Plus, X,
  Calendar, Download, Mail, User, Eye
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { StatusBadge } from "../../components/status-badge";
import { apiClient } from "../../lib/api-client";
import * as Tabs from "@radix-ui/react-tabs";

interface Props {
  viewRole: ExtendedRole;
}

export function CompaniesPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [selected, setSelected] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [committedNew, setCommittedNew] = useState(false);
  const [companyNameQuery, setCompanyNameQuery] = useState("");
  const [companyForm, setCompanyForm] = useState({
    name: "", contactPerson: "", contactEmail: "", industry: "", phone: "", address: "", city: "", region: ghanaRegions[0], country: "Ghana",
  });
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState<CreateBranchRequest>({
    name: "", region: ghanaRegions[0], location: "", telephone: "", address: "",
  });
  const [branchLoading, setBranchLoading] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.getCompanies();
    if (res.success) setCompanies(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const industries = useMemo(
    () => [...new Set(companies.map((c: any) => c.industry).filter(Boolean) as string[])].sort(),
    [companies]
  );

  const filtered = useMemo(() => companies.filter((c: any) => {
    const matchSearch = !search ||
      (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_person_name ?? c.contactPerson ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.industry ?? "").toLowerCase().includes(search.toLowerCase());
    const status = c.approval_status ?? c.status ?? "";
    const matchStatus = statusFilter === "All" || status === statusFilter;
    const matchIndustry = industryFilter === "All" || c.industry === industryFilter;
    return matchSearch && matchStatus && matchIndustry;
  }), [companies, search, statusFilter, industryFilter]);

  const approved = companies.filter((c: any) => (c.approval_status ?? c.status) === "approved").length;
  const pending = companies.filter((c: any) => (c.approval_status ?? c.status) === "pending").length;
  const rejected = companies.filter((c: any) => (c.approval_status ?? c.status) === "rejected").length;

  const searchCompanies = (query: string, limit = 6) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return companies.filter((c: any) => (c.name ?? "").toLowerCase().includes(q)).slice(0, limit).map((c: any) => ({ company: c }));
  };
  const findCompanyByName = (name: string) =>
    companies.find((c: any) => (c.name ?? "").toLowerCase() === name.toLowerCase());

  const handleApproveCompany = async (id: string) => {
    const r = await apiClient.approveCompany(id);
    if (r.success) { toast.success(r.message ?? "Company approved."); fetchCompanies(); }
    else toast.error(r.message ?? "Failed.");
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error("Please provide a rejection reason."); return; }
    const r = await apiClient.rejectCompany(rejectModal.id, rejectReason);
    if (r.success) {
      toast.success(r.message ?? "Company rejected.");
      setRejectModal(null); setRejectReason(""); fetchCompanies();
    } else toast.error(r.message ?? "Failed.");
  };

  const handleAddCompany = async () => {
    const payload: Record<string, unknown> = {
      name: companyForm.name,
      email: companyForm.contactEmail,
      phone: companyForm.phone,
      address: companyForm.address,
      city: companyForm.city,
      region: companyForm.region,
      country: companyForm.country,
      contact_person_name: companyForm.contactPerson,
      industry: companyForm.industry || undefined,
    };
    const r = await apiClient.createCompany(payload);
    if (r.success) {
      toast.success(r.message ?? "Company submitted for approval.");
      closeAddCompany(); fetchCompanies();
    } else toast.error(r.message ?? "Failed to create company.");
  };

  const closeAddCompany = () => {
    setShowAddCompany(false);
    setCompanyForm({ name: "", contactPerson: "", contactEmail: "", industry: "", phone: "", address: "", city: "", region: ghanaRegions[0], country: "Ghana" });
    setCompanyNameQuery(""); setCommittedNew(false);
  };

  const handleSelectCompany = async (c: any) => {
    setSelected(c);
    const res = await apiClient.getCompanyBranches(String(c.id));
    if (res.success) setBranches(res.data ?? []);
  };

  const handleAddBranch = async () => {
    if (!selected || !branchForm.name.trim()) {
      toast.error("Branch name is required.");
      return;
    }
    setBranchLoading(true);
    const res = await apiClient.createCompanyBranch(String(selected.id), branchForm);
    if (res.success) {
      setBranches((prev) => [...prev, res.data]);
      setShowBranchForm(false);
      setBranchForm({ name: "", region: ghanaRegions[0], location: "", telephone: "", address: "" });
      toast.success("Branch added.");
    } else toast.error(res.message ?? "Failed to add branch.");
    setBranchLoading(false);
  };

  const closeBranchForm = () => {
    setShowBranchForm(false);
    setBranchForm({ name: "", region: ghanaRegions[0], location: "", telephone: "", address: "" });
  };

  const closeCompanyModal = () => {
    setSelected(null);
    setBranches([]);
    setShowBranchForm(false);
    setBranchForm({ name: "", region: ghanaRegions[0], location: "", telephone: "", address: "" });
  };

  const companyNameMatches = useMemo(() => searchCompanies(companyNameQuery), [companyNameQuery, companies]);
  const exactNameMatch = useMemo(() => companyNameQuery.trim() ? findCompanyByName(companyNameQuery) : undefined, [companyNameQuery, companies]);

  const sortedCompanies = useMemo(() => [...filtered].sort((a, b) => {
    const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
    const statusA = a.approval_status ?? a.status ?? "";
    const statusB = b.approval_status ?? b.status ?? "";
    return (order[statusA] ?? 99) - (order[statusB] ?? 99);
  }), [filtered]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <SkeletonStatCards count={4} />
        <SkeletonCardGrid cards={6} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Company Management</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {companies.length} compan{companies.length !== 1 ? "ies" : "y"} · manage approvals and partnerships
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
            onClick={() => setShowAddCompany(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 flex items-center gap-2"
            style={{ fontSize: "0.85rem" }}
          >
            <Plus className="w-4 h-4" /> Add Company
          </button>
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: "Total", value: companies.length, icon: Building2, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
          { label: "Approved", value: approved, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Pending", value: pending, icon: Calendar, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
          { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-500/10" },
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

      {/* ── Filters ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card" style={{ fontSize: "0.85rem" }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["All", "approved", "pending", "rejected"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
              style={{ fontSize: "0.8rem" }}>
              {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }}>
          <option value="All">All Industries</option>
          {industries.map((ind) => <option key={ind}>{ind}</option>)}
        </select>
        <button
          onClick={() => exportToCSV(filtered.map((c: any) => ({
            Company: c.name, Industry: c.industry ?? "", Contact: c.contact_person_name ?? c.contactPerson ?? "", Email: c.email ?? c.contactEmail ?? "", Status: c.approval_status ?? c.status ?? "",
          })), "companies_export")}
          className="px-3 py-2 border border-border rounded-lg hover:bg-accent flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* ── Timeline View ────────────────────────────────────────────────────────── */}
      {viewMode === "timeline" ? (
        <div className="bg-card rounded-2xl p-5 space-y-3">
          <h3>Companies</h3>
          {sortedCompanies.length === 0 && (
            <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No companies found.</p>
          )}
          {sortedCompanies.map((c: any) => {
            const companyId = String(c.id);
            const approvalStatus = c.approval_status ?? c.status ?? "";
            return (
              <div
                key={companyId}
                className="border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSelectCompany(c)}
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      approvalStatus === "approved" ? "bg-emerald-500" :
                      approvalStatus === "pending" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</span>
                    <StatusBadge status={approvalStatus} />
                  </div>
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{c.industry || "—"}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Contact", c.contact_person_name ?? c.contactPerson ?? "—"],
                    ["Email", c.email ?? c.contactEmail ?? "—"],
                    ["City", c.city || "—"],
                    ["Supervisors", `${c.industry_supervisors?.length ?? 0}`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{label}</p>
                      <p style={{ fontSize: "0.8rem" }} className="truncate">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Cards View ──────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCompanies.map((c: any) => {
            const companyId = String(c.id);
            const approvalStatus = c.approval_status ?? c.status ?? "";
            return (
              <div
                key={companyId}
                className="bg-card rounded-2xl p-5 space-y-3 hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }} className="truncate">{c.name}</p>
                  </div>
                  <StatusBadge status={approvalStatus} />
                </div>

                <div className="space-y-1.5">
                  {([
                    ["Industry", c.industry || "—"],
                    ["Contact", c.contact_person_name ?? c.contactPerson ?? "—"],
                    ["Email", c.email ?? c.contactEmail ?? "—"],
                    ["City", c.city || "—"],
                    ["Supervisors", `${c.industry_supervisors?.length ?? 0}`],
                    ["Max Interns", c.max_interns || "—"],
                  ] as const).map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.75rem" }}>{l}</span>
                      <span className="text-right" style={{ fontSize: "0.75rem" }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleSelectCompany(c)}
                    className="flex-1 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-1 text-muted-foreground transition-colors"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  {approvalStatus === "pending" && (
                    <>
                      <button onClick={() => handleApproveCompany(companyId)}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-1 transition-opacity"
                        style={{ fontSize: "0.8rem" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => setRejectModal({ id: companyId })}
                        className="py-1.5 px-3 border border-destructive text-destructive rounded-lg hover:bg-red-50 transition-colors"
                        title="Reject company">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {sortedCompanies.length === 0 && !loading && (
            <div className="col-span-3 text-center py-14 text-muted-foreground bg-card rounded-2xl" style={{ fontSize: "0.85rem" }}>
              No companies found. Try adjusting filters.
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal with Tabs ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => closeCompanyModal()}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3>Company Details</h3>
                <button onClick={() => closeCompanyModal()} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p style={{ fontSize: "0.95rem" }} className="font-medium">{selected.name}</p>
                  <StatusBadge status={selected.approval_status ?? selected.status ?? ""} />
                </div>
              </div>
            </div>

            <Tabs.Root defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
              <Tabs.List className="flex border-b border-border px-5 bg-secondary/30">
                <Tabs.Trigger value="basic" className="px-4 py-2 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground text-muted-foreground transition-colors">
                  Basic Info
                </Tabs.Trigger>
                <Tabs.Trigger value="contact" className="px-4 py-2 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground text-muted-foreground transition-colors">
                  <Mail className="w-4 h-4 inline mr-2" />Contact
                </Tabs.Trigger>
                <Tabs.Trigger value="supervisors" className="px-4 py-2 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground text-muted-foreground transition-colors">
                  <User className="w-4 h-4 inline mr-2" />Supervisors
                </Tabs.Trigger>
                <Tabs.Trigger value="approval" className="px-4 py-2 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground text-muted-foreground transition-colors">
                  Approval
                </Tabs.Trigger>
                <Tabs.Trigger value="branches" className="px-4 py-2 text-sm border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary hover:text-foreground text-muted-foreground transition-colors">
                  Branches {branches.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded px-1">{branches.length}</span>}
                </Tabs.Trigger>
              </Tabs.List>

              <div className="overflow-y-auto flex-1">
                <Tabs.Content value="basic" className="p-5 space-y-3 m-0">
                  {([
                    ["Industry", selected.industry],
                    ["Address", selected.address],
                    ["City", selected.city],
                    ["Region", selected.region],
                    ["Country", selected.country],
                    ["Website", selected.website],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">{l}</p>
                      <p style={{ fontSize: "0.85rem" }} className="font-medium">{v}</p>
                    </div>
                  ))}
                  {selected.max_interns && (
                    <div>
                      <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Max Interns</p>
                      <p style={{ fontSize: "0.85rem" }} className="font-medium">{selected.max_interns}</p>
                    </div>
                  )}
                </Tabs.Content>

                <Tabs.Content value="contact" className="p-5 space-y-3 m-0">
                  {([
                    ["Contact Person", selected.contact_person_name ?? selected.contactPerson],
                    ["Contact Email", selected.contact_person_email ?? selected.contactEmail],
                    ["Company Email", selected.email],
                    ["Phone", selected.phone ?? selected.contactPhone],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                    <div key={l}>
                      <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">{l}</p>
                      <p style={{ fontSize: "0.85rem" }} className="font-medium break-all">{v}</p>
                    </div>
                  ))}
                </Tabs.Content>

                <Tabs.Content value="supervisors" className="p-5 m-0">
                  {selected.industry_supervisors && selected.industry_supervisors.length > 0 ? (
                    <div className="space-y-3">
                      {selected.industry_supervisors.map((supervisor: any) => (
                        <div key={supervisor.id} className="p-4 border border-border rounded-lg bg-secondary/10">
                          <p style={{ fontSize: "0.85rem" }} className="font-medium">{supervisor.position}</p>
                          <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{supervisor.department}</p>
                          {supervisor.expertise_areas && (
                            <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground mt-2">{supervisor.expertise_areas}</p>
                          )}
                          <div style={{ fontSize: "0.75rem" }} className="text-muted-foreground mt-3 space-y-1">
                            {supervisor.mobile_phone && <p>📱 {supervisor.mobile_phone}</p>}
                            {supervisor.years_of_experience && <p>⏰ {supervisor.years_of_experience} years experience</p>}
                            <p>👥 {supervisor.current_interns} / {supervisor.max_interns} interns</p>
                            {supervisor.last_login_at && <p>Last active: {new Date(supervisor.last_login_at).toLocaleDateString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>No supervisors assigned yet</p>
                    </div>
                  )}
                </Tabs.Content>

                <Tabs.Content value="approval" className="p-5 space-y-4 m-0">
                  <div>
                    <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Status</p>
                    <p style={{ fontSize: "0.85rem" }} className="font-medium">{selected.approval_status ?? selected.status ?? "Unknown"}</p>
                  </div>
                  {selected.approval_status === "approved" && (
                    <>
                      {selected.approved_by && (
                        <div>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Approved By</p>
                          <p style={{ fontSize: "0.85rem" }} className="font-medium">{selected.approved_by.name}</p>
                          <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">{selected.approved_by.email}</p>
                        </div>
                      )}
                      {selected.approved_at && (
                        <div>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Approved At</p>
                          <p style={{ fontSize: "0.85rem" }} className="font-medium">{new Date(selected.approved_at).toLocaleDateString()}</p>
                        </div>
                      )}
                    </>
                  )}
                  {selected.rejection_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p style={{ fontSize: "0.7rem" }} className="text-red-600 uppercase tracking-wider font-medium">Rejection Reason</p>
                      <p style={{ fontSize: "0.85rem" }} className="text-red-800 mt-2">{selected.rejection_reason}</p>
                    </div>
                  )}
                  <div className="border-t border-border pt-3">
                    <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider">Created</p>
                    <p style={{ fontSize: "0.85rem" }} className="font-medium">{new Date(selected.created_at).toLocaleDateString()}</p>
                  </div>
                </Tabs.Content>

                <Tabs.Content value="branches" className="p-5 space-y-4 m-0">
                  {branches.length === 0 && !showBranchForm && (
                    <p className="text-muted-foreground text-sm">No branches added yet.</p>
                  )}
                  {branches.map((b) => (
                    <div key={b.id} className="border border-border rounded-xl p-3 space-y-1">
                      <p className="font-medium text-sm">{b.name}</p>
                      {b.region && <p className="text-xs text-muted-foreground">Region: {b.region}</p>}
                      {b.location && <p className="text-xs text-muted-foreground">Location: {b.location}</p>}
                      {b.telephone && <p className="text-xs text-muted-foreground">Tel: {b.telephone}</p>}
                      {b.address && <p className="text-xs text-muted-foreground">Address: {b.address}</p>}
                    </div>
                  ))}

                  {showBranchForm ? (
                    <div className="border border-border rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium">New Branch</p>
                      <input
                        type="text"
                        placeholder="Branch Name*"
                        value={branchForm.name}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                      />
                      <select
                        value={branchForm.region ?? ghanaRegions[0]}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, region: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                      >
                        {ghanaRegions.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Location/Town"
                        value={branchForm.location ?? ""}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="Telephone"
                        value={branchForm.telephone ?? ""}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, telephone: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm"
                      />
                      <textarea
                        placeholder="Address"
                        value={branchForm.address ?? ""}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm min-h-20"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={closeBranchForm}
                          className="flex-1 py-1.5 border border-border rounded-lg hover:bg-accent text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddBranch}
                          disabled={branchLoading}
                          className="flex-1 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
                        >
                          {branchLoading ? "Saving..." : "Add Branch"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowBranchForm(true)}
                      className="w-full py-2 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-2 text-sm text-muted-foreground"
                    >
                      <Plus className="w-4 h-4" /> Add Branch
                    </button>
                  )}
                </Tabs.Content>
              </div>
            </Tabs.Root>

            {selected.approval_status === "pending" && (
              <div className="border-t border-border p-4 flex gap-2">
                <button onClick={() => handleApproveCompany(String(selected.id))}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-1"
                  style={{ fontSize: "0.8rem" }}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => setRejectModal({ id: String(selected.id) })}
                  className="flex-1 py-2 border border-destructive text-destructive rounded-lg hover:bg-red-50 flex items-center justify-center gap-1"
                  style={{ fontSize: "0.8rem" }}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3>Reject Company</h3>
              <button onClick={() => setRejectModal(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide reason for rejection (required)..."
              className="w-full border border-border rounded-lg p-3 bg-background min-h-[100px]"
              style={{ fontSize: "0.85rem" }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={handleRejectSubmit} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90" style={{ fontSize: "0.85rem" }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Company Modal ────────────────────────────────────────────────────── */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeAddCompany}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2>Add New Company</h2>
              <button onClick={closeAddCompany} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              Search by name first — if the company already exists, create a new one.
            </p>

            <div className="space-y-2">
              <label style={{ fontSize: "0.8rem" }}>Company Name *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={companyNameQuery}
                  onChange={(e) => { setCompanyNameQuery(e.target.value); setCommittedNew(false); setCompanyForm({ ...companyForm, name: e.target.value }); }}
                  placeholder="Start typing… e.g., MTN Ghana"
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>

              {companyNameQuery.trim() && !committedNew && (
                <div className="space-y-2">
                  {companyNameMatches.length > 0 ? (
                    <>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{companyNameMatches.length} match{companyNameMatches.length === 1 ? "" : "es"} found.</p>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {companyNameMatches.map(({ company: c }: { company: any }) => (
                          <button key={c.id} type="button"
                            className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex items-start justify-between gap-2">
                            <div>
                              <p style={{ fontSize: "0.85rem" }}>{c.name}</p>
                              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{c.email ?? c.contactEmail}</p>
                            </div>
                            <StatusBadge status={c.approval_status ?? c.status ?? ""} />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground italic" style={{ fontSize: "0.75rem" }}>No matches found.</p>
                  )}
                  {!exactNameMatch && (
                    <button type="button" onClick={() => setCommittedNew(true)}
                      className="w-full p-2.5 rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 text-primary flex items-center justify-center gap-2"
                      style={{ fontSize: "0.85rem" }}>
                      <Plus className="w-4 h-4" /> Register "{companyNameQuery}" as new
                    </button>
                  )}
                </div>
              )}
            </div>

            {committedNew && !exactNameMatch && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.65rem" }}>Company Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
                    ["Email *", "contactEmail", "info@company.com", "email"],
                    ["Phone *", "phone", "+233...", "tel"],
                    ["Contact Person", "contactPerson", "Full name", "text"],
                    ["Industry", "industry", "e.g., Telecommunications", "text"],
                    ["Address *", "address", "Street address", "text"],
                    ["City *", "city", "e.g., Accra", "text"],
                  ] as [string, keyof typeof companyForm, string, string][]).map(([label, field, placeholder, type]) => (
                    <div key={field} className={label.includes("Address") ? "md:col-span-2" : ""}>
                      <label style={{ fontSize: "0.8rem" }}>{label}</label>
                      <input type={type} value={(companyForm as any)[field]} onChange={(e) => setCompanyForm({ ...companyForm, [field]: e.target.value })}
                        placeholder={placeholder} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: "0.8rem" }}>Region *</label>
                    <select value={companyForm.region} onChange={(e) => setCompanyForm({ ...companyForm, region: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }}>
                      {ghanaRegions.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button onClick={closeAddCompany} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Cancel</button>
              <button onClick={handleAddCompany} disabled={!committedNew || !!exactNameMatch}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ fontSize: "0.85rem" }}>
                <Plus className="w-4 h-4" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
