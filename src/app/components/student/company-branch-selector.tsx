import { useState, useMemo, useEffect } from "react";
import { GitBranch, Search, Building2, Plus, AlertCircle, Info, User, Mail, Phone, MapPin } from "lucide-react";
import { StatusBadge } from "../status-badge";
import { ghanaRegions } from "../../lib/mock-data";
import { apiClient } from "../../lib/api-client";

type CompanyChoice = "none" | "existing" | "new";
type BranchChoice = "none" | "existing" | "new";

interface FormData {
  termId: string;
  companyChoice: CompanyChoice;
  selectedCompanyId: string;
  newCompanyName: string;
  newCompanyContactPerson: string;
  newCompanyContactEmail: string;
  branchChoice: BranchChoice;
  selectedBranchId: string;
  newBranchName: string;
  newBranchRegion: string;
  newBranchLocation: string;
  newBranchAddress: string;
  newBranchTelephone: string;
  phoneNumber: string;
  emergencyContact: string;
  emergencyPhone: string;
  preferredStartDate: string;
  additionalNotes: string;
  uploadCV: boolean;
  uploadMotivation: boolean;
  agreeToTerms: boolean;
}

interface CompanyBranchSelectorProps {
  form: FormData;
  updateForm: (updates: Partial<FormData>) => void;
  companies: any[];
  branches?: any[];
}

export function CompanyBranchSelector({
  form,
  updateForm,
  companies,
  branches = [],
}: CompanyBranchSelectorProps) {
  const [companySearch, setCompanySearch] = useState("");

  const selectedCompany = companies.find((c: any) => String(c.id) === form.selectedCompanyId);
  const branchesForSelected = branches;

  const searchCompanies = (query: string, limit: number) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return (companies as any[])
      .filter((c: any) => c.name?.toLowerCase().includes(q))
      .slice(0, limit)
      .map((c: any) => ({ company: c }));
  };

  const findCompanyByName = (name: string) =>
    (companies as any[]).find((c: any) => c.name?.toLowerCase() === name.trim().toLowerCase());

  // Live search results
  const matches = useMemo(() => searchCompanies(companySearch, 8), [companySearch, companies]);
  const exactDup = useMemo(
    () => (companySearch.trim() ? findCompanyByName(companySearch) : undefined),
    [companySearch, companies]
  );
  // Live duplicate check on new-company name
  const newCompanyDup = useMemo(
    () => (form.newCompanyName.trim() ? findCompanyByName(form.newCompanyName) : undefined),
    [form.newCompanyName, companies]
  );
  // Check if new branch name already exists
  const newBranchDup = useMemo(
    () => branchesForSelected.find(
      (b) => typeof b.name === "string" && b.name.toLowerCase() === form.newBranchName.trim().toLowerCase()
    ),
    [branchesForSelected, form.newBranchName]
  );
  return (
    <div className="space-y-5">
      <div>
        <h3>Find your Internship Company & Branch</h3>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
          Select an approved organization already in the database, or register a new one for Departmental review.
        </p>
      </div>

      {/* SCENARIO 0: No company selected yet -> search bar */}
      {form.companyChoice === "none" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search company name, e.g., MTN Ghana..."
              className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>

          {companySearch.trim() && (
            <div className="space-y-3">
              <p className="text-muted-foreground uppercase tracking-wider" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
                Matching Results
              </p>
              {matches.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {matches.map(({ company: c }) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        updateForm({
                          companyChoice: "existing",
                          selectedCompanyId: String(c.id),
                          branchChoice: "none",
                        })
                      }
                      className="w-full text-left p-3.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all bg-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p style={{ fontSize: "0.9rem" }} className="font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
                            {c.industry || "—"} · {c.contact_person_name || c.contactPerson || "—"}
                          </p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-secondary/30 rounded-xl p-4 text-center">
                  <Search className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    No matching companies found for "{companySearch}".
                  </p>
                </div>
              )}

              {/* Register as new company */}
              {!exactDup ? (
                <button
                  type="button"
                  onClick={() =>
                    updateForm({
                      companyChoice: "new",
                      selectedCompanyId: "",
                      newCompanyName: companySearch,
                      branchChoice: "new",
                    })
                  }
                  className="w-full p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-primary bg-card"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Plus className="w-4 h-4" />
                  Register "{companySearch}" as a new company
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-amber-800" style={{ fontSize: "0.8rem" }}>
                    <strong>"{typeof exactDup?.name === "string" ? exactDup.name : "Company"}"</strong> already exists in the system. Please select it from the suggestions above and add a branch instead of creating a duplicate.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SCENARIO 1: Existing company chosen -> branch picker */}
      {form.companyChoice === "existing" && selectedCompany && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p style={{ fontSize: "0.95rem" }} className="font-medium text-foreground">
                  {typeof selectedCompany.name === "string" ? selectedCompany.name : "Company"}
                </p>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
                  {typeof selectedCompany.contact_person_name === "string" ? selectedCompany.contact_person_name : (typeof selectedCompany.contactPerson === "string" ? selectedCompany.contactPerson : "—")} · {typeof selectedCompany.contact_person_email === "string" ? selectedCompany.contact_person_email : (typeof selectedCompany.contactEmail === "string" ? selectedCompany.contactEmail : "—")}
                </p>
                <div className="mt-1">
                  <StatusBadge status={selectedCompany.status} />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                updateForm({
                  companyChoice: "none",
                  selectedCompanyId: "",
                  branchChoice: "none",
                  selectedBranchId: "",
                });
              }}
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Change
            </button>
          </div>

          {/* Warn if company is somehow not yet approved */}
          {selectedCompany && selectedCompany.approval_status !== "approved" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800" style={{ fontSize: "0.8rem" }}>
                <strong>{selectedCompany.name}</strong> is pending DLO approval. You cannot submit an application until the company is approved. Please check back later or choose a different company.
              </p>
            </div>
          )}

          <div>
            <h4 className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-primary" />
              Select a Branch
            </h4>
            <p className="text-muted-foreground mb-3" style={{ fontSize: "0.8rem" }}>
              Choose where you'll be doing your attachment, or add a new branch if it isn't listed.
            </p>

            <div className="space-y-2">
              {branchesForSelected.length === 0 && (
                <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>
                  No branches recorded yet. Add the first one below.
                </p>
              )}
              {branchesForSelected.map((b) => {
                const branchName = typeof b.name === "string" ? b.name : "Branch";
                const location = typeof b.location === "string" ? b.location : "—";
                const region = typeof b.region === "string" ? b.region : "—";
                const telephone = typeof b.telephone === "string" ? b.telephone : "—";
                const address = typeof b.address === "string" ? b.address : "—";
                const branchId = typeof b.id === "string" ? b.id : String(b.id);

                return (
                  <button
                    key={branchId}
                    type="button"
                    onClick={() => updateForm({ branchChoice: "existing", selectedBranchId: branchId })}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      form.branchChoice === "existing" && form.selectedBranchId === branchId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p style={{ fontSize: "0.85rem" }} className="font-medium">
                          {branchName}
                        </p>
                        <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
                          {location}, {region} · {telephone}
                        </p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                          {address}
                        </p>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => updateForm({ branchChoice: "new", selectedBranchId: "" })}
                className={`w-full p-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
                  form.branchChoice === "new"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
                style={{ fontSize: "0.85rem" }}
              >
                <Plus className="w-4 h-4" /> Add a New Branch
              </button>
            </div>
          </div>

          {form.branchChoice === "new" && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-amber-800" style={{ fontSize: "0.8rem" }}>
                  New branches require DLO approval. The branch will be created with status <strong>Pending</strong>.
                </p>
              </div>
              <BranchFieldsBlock
                form={form}
                updateForm={updateForm}
                ghanaRegions={ghanaRegions}
                dupWarning={
                  newBranchDup
                    ? `A branch named "${typeof newBranchDup.name === "string" ? newBranchDup.name : "Branch"}" already exists for this company.`
                    : undefined
                }
              />
            </div>
          )}
        </div>
      )}

      {/* SCENARIO 2: Brand-new company -> company + branch registration form */}
      {form.companyChoice === "new" && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Plus className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p style={{ fontSize: "0.9rem" }} className="font-medium">
                  Registering a new company
                </p>
                <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
                  Both the company and its first branch will be sent for DLO approval.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateForm({
                  companyChoice: "none",
                  newCompanyName: "",
                  newCompanyContactPerson: "",
                  newCompanyContactEmail: "",
                  branchChoice: "none",
                })
              }
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Company Fields */}
          <div>
            <h4 className="mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Company Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label style={{ fontSize: "0.8rem" }}>Company Name *</label>
                <input
                  type="text"
                  value={form.newCompanyName}
                  onChange={(e) => updateForm({ newCompanyName: e.target.value })}
                  placeholder="e.g., Accra Digital Centre"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
                {newCompanyDup && (
                  <p className="text-amber-700 mt-1 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    "{typeof newCompanyDup.name === "string" ? newCompanyDup.name : "Company"}" already exists. Please go back and select it instead.
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Contact Person *</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.newCompanyContactPerson}
                    onChange={(e) => updateForm({ newCompanyContactPerson: e.target.value })}
                    placeholder="Name of contact"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Contact Email *</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={form.newCompanyContactEmail}
                    onChange={(e) => updateForm({ newCompanyContactEmail: e.target.value })}
                    placeholder="email@company.com"
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* First branch fields */}
          <div className="border-t border-border pt-4">
            <h4 className="mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> First Branch Details
            </h4>
            <BranchFieldsBlock form={form} updateForm={updateForm} ghanaRegions={ghanaRegions} />
          </div>
        </div>
      )}
    </div>
  );
}

interface BranchFieldsBlockProps {
  form: FormData;
  updateForm: (updates: Partial<FormData>) => void;
  ghanaRegions: string[];
  dupWarning?: string;
}

function BranchFieldsBlock({ form, updateForm, ghanaRegions, dupWarning }: BranchFieldsBlockProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label style={{ fontSize: "0.8rem" }}>Branch Name *</label>
        <input
          type="text"
          value={form.newBranchName}
          onChange={(e) => updateForm({ newBranchName: e.target.value })}
          placeholder="e.g., Head Office, Kumasi Branch"
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
          style={{ fontSize: "0.85rem" }}
        />
        {dupWarning && (
          <p className="text-amber-700 mt-1 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
            <AlertCircle className="w-3.5 h-3.5" /> {dupWarning}
          </p>
        )}
      </div>
      <div>
        <label style={{ fontSize: "0.8rem" }}>Region *</label>
        <select
          value={form.newBranchRegion}
          onChange={(e) => updateForm({ newBranchRegion: e.target.value })}
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
          style={{ fontSize: "0.85rem" }}
        >
          {ghanaRegions.map((r) => {
            const regionStr = typeof r === "string" ? r : String(r);
            return (
              <option key={regionStr} value={regionStr}>
                {regionStr}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label style={{ fontSize: "0.8rem" }}>Location (Town/City) *</label>
        <input
          type="text"
          value={form.newBranchLocation}
          onChange={(e) => updateForm({ newBranchLocation: e.target.value })}
          placeholder="e.g., Accra, Ho, Kumasi"
          className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
          style={{ fontSize: "0.85rem" }}
        />
      </div>
      <div>
        <label style={{ fontSize: "0.8rem" }}>Telephone Number *</label>
        <div className="relative mt-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="tel"
            value={form.newBranchTelephone}
            onChange={(e) => updateForm({ newBranchTelephone: e.target.value })}
            placeholder="+233..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
      </div>
      <div className="md:col-span-2">
        <label style={{ fontSize: "0.8rem" }}>Branch Address *</label>
        <div className="relative mt-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={form.newBranchAddress}
            onChange={(e) => updateForm({ newBranchAddress: e.target.value })}
            placeholder="Full street address"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
      </div>
    </div>
  );
}
