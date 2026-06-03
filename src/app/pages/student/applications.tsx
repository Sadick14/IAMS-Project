// StudentApplicationsPage.tsx
import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import { ghanaRegions } from "../../lib/mock-data";
import {
  Calendar,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { TermSelector } from "../../components/student/term-selector";
import { CompanyBranchSelector } from "../../components/student/company-branch-selector";
import { PersonalDetailsForm } from "../../components/student/personal-details-form";
import { ApplicationReview } from "../../components/student/application-review";
import { ApplicationTracker } from "../../components/student/application-tracker";
import { TermWindowsList } from "../../components/student/term-windows-list";

type View = "windows" | "apply" | "tracker";
type Step = 1 | 2 | 3 | 4;

// Normalize term data from API response using same pattern as CLO terms page
function toDateStr(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function normalizeTerm(t: any) {
  return {
    id: String(t.id),
    name: t.name ?? "Term",
    status: String(t.status ?? "upcoming").toLowerCase(),
    type: String(t.type ?? "regular").toLowerCase(),
    // Real API uses application_deadline; fallback to legacy fields
    applicationStart: toDateStr(t.application_deadline ?? t.application_start ?? t.applicationStart),
    applicationEnd: toDateStr(t.application_end ?? t.applicationEnd) || toDateStr(t.application_deadline ?? t.application_start ?? t.applicationStart),
    // Real API uses start_date/end_date for internship period
    internshipStart: toDateStr(t.start_date ?? t.internship_start ?? t.internshipStart),
    internshipEnd: toDateStr(t.end_date ?? t.internship_end ?? t.internshipEnd),
    eligibleLevels: t.eligible_levels ?? t.eligibleLevels ?? [],
    departments: (t.departments ?? []).map((d: any) =>
      typeof d === "string" ? d : d.name ?? String(d)
    ),
  };
}

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

const defaultForm: FormData = {
  termId: "",
  companyChoice: "none",
  selectedCompanyId: "",
  newCompanyName: "",
  newCompanyContactPerson: "",
  newCompanyContactEmail: "",
  branchChoice: "none",
  selectedBranchId: "",
  newBranchName: "",
  newBranchRegion: ghanaRegions[6] ?? "Greater Accra",
  newBranchLocation: "",
  newBranchAddress: "",
  newBranchTelephone: "",
  phoneNumber: "",
  emergencyContact: "",
  emergencyPhone: "",
  preferredStartDate: "",
  additionalNotes: "",
  uploadCV: false,
  uploadMotivation: false,
  agreeToTerms: false,
};

export function StudentApplicationsPage() {
  const { user } = useAppContext();
  const [myApp, setMyApp] = useState<any | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.getApplications(),
      apiClient.getTerms(),
      apiClient.getCompanies(),
    ]).then(([appsRes, termsRes, companiesRes]) => {
      if (appsRes.success && appsRes.data.length > 0) {
        const sorted = [...appsRes.data].sort((a, b) =>
          (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1
        );
        setMyApp(sorted[0]);
      }
      if (termsRes.success) setTerms(termsRes.data.map(normalizeTerm));
      if (companiesRes.success) setCompanies(companiesRes.data);
    });
  }, []);

  const [view, setView] = useState<View>("windows");
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  // Load branches when company selection changes
  useEffect(() => {
    if (form.selectedCompanyId && form.companyChoice === "existing") {
      apiClient.getCompanyBranches(form.selectedCompanyId).then((res) => {
        if (res.success) setBranches(res.data ?? []);
      });
    } else {
      setBranches([]);
    }
  }, [form.selectedCompanyId, form.companyChoice]);

  const { execute: submitAction, loading: isSubmitting } = useToastAction();

  const availableTerms = terms.filter(
    (t) => t.status === "active" || t.status === "upcoming"
  );

  const selectedTerm    = terms.find((t) => t.id === form.termId);
  const selectedCompany = companies.find((c) => String(c.id) === form.selectedCompanyId);
  const selectedBranch  = form.branchChoice === "existing" && form.selectedBranchId
    ? branches.find((b) => String(b.id) === form.selectedBranchId)
    : form.branchChoice === "new"
    ? {
        id: "new",
        name: form.newBranchName,
        region: form.newBranchRegion,
        location: form.newBranchLocation,
        address: form.newBranchAddress,
        telephone: form.newBranchTelephone,
      }
    : null;

  const updateForm = (updates: Partial<FormData>) => setForm((prev) => ({ ...prev, ...updates }));

  const checkEligibility = (termId: string): boolean => {
    const term = terms.find((t) => String(t.id) === termId);
    if (!term) return false;

    const today = new Date().toISOString().split("T")[0];
    if (term.applicationEnd && today > term.applicationEnd) {
      setEligibilityError(`The application deadline has passed (${term.applicationEnd}).`);
      return false;
    }
    if (term.applicationStart && today < term.applicationStart) {
      setEligibilityError(`The application window has not opened yet. It opens on ${term.applicationStart}.`);
      return false;
    }

    if (myApp && !["completed", "rejected"].includes(myApp.status ?? "")) {
      setEligibilityError(
        "You already have an active application. You cannot submit another one until your current application is resolved."
      );
      return false;
    }

    setEligibilityError(null);
    return true;
  };

  const handleSelectTerm = (termId: string) => {
    updateForm({ termId });
    checkEligibility(termId);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!form.termId && !eligibilityError;
      case 2: {
        if (form.companyChoice === "existing") {
          if (!form.selectedCompanyId) return false;
          if (form.branchChoice === "existing") return !!form.selectedBranchId;
          if (form.branchChoice === "new") {
            return !!(
              form.newBranchName &&
              form.newBranchRegion &&
              form.newBranchLocation &&
              form.newBranchAddress &&
              form.newBranchTelephone
            );
          }
          return false;
        }
        if (form.companyChoice === "new") {
          const hasDuplicateCompany = form.newCompanyName.trim()
            ? companies.some((c: any) => c.name?.toLowerCase() === form.newCompanyName.trim().toLowerCase())
            : false;
          return !!(
            form.newCompanyName &&
            form.newCompanyContactPerson &&
            form.newCompanyContactEmail &&
            !hasDuplicateCompany &&
            form.newBranchName &&
            form.newBranchRegion &&
            form.newBranchLocation &&
            form.newBranchAddress &&
            form.newBranchTelephone
          );
        }
        return false;
      }
      case 3:
        return !!(form.phoneNumber && form.emergencyContact && form.emergencyPhone);
      case 4:
        return form.agreeToTerms;
      default:
        return false;
    }
  };

  const handleCancelApplication = async () => {
    if (!myApp?.id) return;
    const res = await apiClient.deleteApplication(String(myApp.id));
    if (res.success) {
      setMyApp(null);
      setView("windows");
      setStep(1);
      setForm({ ...defaultForm });
    }
    return res;
  };

  const handleSubmit = async () => {
    await submitAction(
      async () => {
        let companyId = "";
        const actor = user?.name || "Student";

        if (form.companyChoice === "existing") {
          const company = companies.find((c: any) => String(c.id) === form.selectedCompanyId);
          if (!company) {
            return { success: false, data: null, message: "Selected company not found." };
          }
          companyId = String(company.id);

          if (form.branchChoice === "existing") {
            // branch already selected, fine
          } else {
            const branchRes = await apiClient.createCompanyBranch(String(company.id), {
              name: form.newBranchName,
              region: form.newBranchRegion,
              location: form.newBranchLocation,
              address: form.newBranchAddress,
              telephone: form.newBranchTelephone,
            });
            if (!branchRes.success || !branchRes.data) {
              return { success: false, data: null, message: branchRes.message || "Failed to create branch." };
            }
          }
        } else {
          const companyRes = await apiClient.createCompanyWithBranch(
            {
              name: form.newCompanyName,
              contactPerson: form.newCompanyContactPerson,
              contactEmail: form.newCompanyContactEmail,
              addedBy: actor,
              autoApprove: false,
            },
            {
              name: form.newBranchName,
              region: form.newBranchRegion,
              location: form.newBranchLocation,
              address: form.newBranchAddress,
              telephone: form.newBranchTelephone,
              addedBy: actor,
              autoApprove: false,
            }
          );
          if (!companyRes.success || !companyRes.data) {
            return { success: false, data: null, message: companyRes.message || "Failed to register company." };
          }
          companyId = companyRes.data.company.id;
        }

        const submitRes = await apiClient.createApplication({
          company_id: Number(companyId),
          academic_term_id: Number(form.termId),
          application_type: "individual",
          cover_letter: form.additionalNotes || undefined,
          proposed_start_date: form.preferredStartDate || undefined,
        });
        if (submitRes.success) {
          setForm({ ...defaultForm });
          setView("tracker");
        }
        return submitRes;
      },
      {
        successMessage: "Application submitted successfully!",
        errorMessage: "Submission failed. Please check details.",
      }
    );
  };

  const steps = [
    { num: 1, label: "Internship Window" },
    { num: 2, label: "Company" },
    { num: 3, label: "Details & Documents" },
    { num: 4, label: "Review & Submit" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1>Applications</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            View open internship windows, apply, and track your application
          </p>
        </div>
        <div className="flex gap-3 justify-center shrink-0">
          {[
            { key: "windows" as const, label: "Open Windows", icon: Calendar },
            { key: "apply" as const, label: "Apply", icon: FileText },
            { key: "tracker" as const, label: "My Application", icon: Eye },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setView(tab.key);
                if (tab.key === "apply") setStep(1);
              }}
              className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:gap-2 ${
                view === tab.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="w-5 sm:w-4 h-5 sm:h-4" />
              <span className="hidden sm:inline" style={{ fontSize: "0.8rem" }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {view === "windows" && (
        <TermWindowsList
          availableTerms={availableTerms}
          onSelectTerm={handleSelectTerm}
          onViewChange={setView}
        />
      )}

      {view === "apply" && (
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6 relative overflow-hidden">
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Submitting application...</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-b border-border pb-5 overflow-x-auto">
            {steps.map((s) => {
              const active = step === s.num;
              const passed = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2 whitespace-nowrap">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      active
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : passed
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {passed ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    style={{ fontSize: "0.8rem" }}
                    className={active ? "font-bold text-foreground" : "text-muted-foreground"}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="min-h-[300px]">
            {step === 1 && (
              <TermSelector
                availableTerms={availableTerms}
                selectedTermId={form.termId}
                eligibilityError={eligibilityError}
                onSelectTerm={handleSelectTerm}
              />
            )}
            {step === 2 && (
              <CompanyBranchSelector
                form={form}
                updateForm={updateForm}
                companies={companies}
                branches={branches}
              />
            )}
            {step === 3 && <PersonalDetailsForm form={form} updateForm={updateForm} user={user} />}
            {step === 4 && (
              <ApplicationReview
                form={form}
                updateForm={updateForm}
                user={user}
                selectedTerm={selectedTerm}
                selectedCompany={selectedCompany}
                selectedBranch={selectedBranch}
              />
            )}
          </div>

          <div className="flex justify-between items-center border-t border-border pt-5">
            <button
              type="button"
              onClick={() => (step === 1 ? setView("windows") : setStep((step - 1) as Step))}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Back to Windows" : "Previous"}
            </button>
            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              Step {step} of 4
            </p>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => canProceed() && setStep((step + 1) as Step)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                style={{ fontSize: "0.85rem" }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                style={{ fontSize: "0.85rem" }}
              >
                <CheckCircle2 className="w-4 h-4" /> Submit Application
              </button>
            )}
          </div>
        </div>
      )}

      {view === "tracker" && (
        <ApplicationTracker
          myApp={myApp}
          terms={terms}
          onViewWindows={() => setView("windows")}
          onCancelApplication={handleCancelApplication}
          onAcceptanceSubmitted={() => {
            apiClient.getApplications().then((res) => {
              if (res.success && res.data.length > 0) {
                const sorted = [...res.data].sort((a, b) =>
                  (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1
                );
                setMyApp(sorted[0]);
              }
            });
          }}
        />
      )}
    </div>
  );
}