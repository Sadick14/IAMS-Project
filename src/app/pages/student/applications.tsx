// StudentApplicationsPage.tsx
import { useState, useEffect, useCallback } from "react";
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
  RotateCcw,
  Save,
  AlertCircle,
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
      apiClient.getCompanies({ status: "approved" }),
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
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  // Per-user draft keys so drafts don't bleed between accounts
  const draftKey  = `application_form_${user?.id ?? "anon"}`;
  const stepKey   = `application_step_${user?.id ?? "anon"}`;

  // Draft is not a real pending application — it means a previous submit half-failed.
  // Exclude it so students aren't permanently blocked by an orphan backend draft.
  const hasPendingApplication = myApp && !["rejected", "completed", "draft"].includes((myApp.status ?? "").toLowerCase());

  const hasMeaningfulDraft = useCallback((f: FormData, s: number) =>
    s > 1 || !!f.termId || !!f.selectedCompanyId || !!f.newCompanyName, []);

  // Restore draft on mount (but don't auto-navigate — show a banner instead)
  useEffect(() => {
    try {
      const savedForm = localStorage.getItem(draftKey);
      const savedStep = localStorage.getItem(stepKey);
      if (savedForm && savedStep) {
        const f: FormData = JSON.parse(savedForm);
        const s = parseInt(savedStep) as Step;
        if (hasMeaningfulDraft(f, s)) {
          setForm(f);
          setStep(s);
          setHasSavedDraft(true);
          // Don't auto-jump to apply view; show resume banner on windows view instead
        }
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft only while the student is actively in the apply flow
  useEffect(() => {
    if (view === "apply") {
      localStorage.setItem(draftKey, JSON.stringify(form));
      localStorage.setItem(stepKey, String(step));
      setHasSavedDraft(hasMeaningfulDraft(form, step));
    }
  }, [form, step, view, draftKey, stepKey, hasMeaningfulDraft]);

  const clearDraft = () => {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(stepKey);
    setForm({ ...defaultForm });
    setStep(1);
    setHasSavedDraft(false);
  };

  const resumeDraft = () => {
    setView("apply");
    // form + step already restored from localStorage on mount
  };

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
    const appDeadline = term.applicationEnd; // Single deadline date

    // Check if deadline has passed
    if (appDeadline && today > appDeadline) {
      setEligibilityError(`The application deadline has passed (${appDeadline}).`);
      return false;
    }

    // Check if already has active application
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
      clearDraft();
      setView("windows");
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

        const createRes = await apiClient.createApplication({
          company_id: Number(companyId),
          academic_term_id: Number(form.termId),
          application_type: "individual",
          cover_letter: form.additionalNotes || undefined,
          proposed_start_date: form.preferredStartDate || undefined,
          status: "submitted", // Create directly as submitted, not draft
        });
        if (!createRes.success || !createRes.data?.id) {
          // If student profile not found, provide helpful message
          if (createRes.message?.toLowerCase().includes("student profile")) {
            return {
              ...createRes,
              message: "Please complete your profile first before submitting an application. Go to 'My Profile' to update your information."
            };
          }
          return createRes;
        }

        clearDraft();
        // Refresh applications data to show the new submission
        const appsRes = await apiClient.getApplications();
        if (appsRes.success && appsRes.data.length > 0) {
          const sorted = [...appsRes.data].sort((a, b) =>
            (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1
          );
          setMyApp(sorted[0]);
        }
        setView("tracker");
        return createRes;
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
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your applications</p>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 justify-center">
        {[
          { key: "windows" as const, label: "Windows", icon: Calendar },
          { key: "apply" as const, label: "Apply", icon: FileText },
          { key: "tracker" as const, label: "Track", icon: Eye },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            disabled={tab.key === "apply" && hasPendingApplication}
            onClick={() => {
              if (tab.key === "apply" && hasPendingApplication) return;
              setView(tab.key);
              // Only reset to step 1 when starting fresh (no draft in progress)
              if (tab.key === "apply" && !hasSavedDraft) setStep(1);
            }}
            className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              tab.key === "apply" && hasPendingApplication
                ? "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                : view === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="w-4 h-4 mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {view === "windows" && (
        <div className="space-y-4">
          {/* Pending Application Block */}
          {hasPendingApplication && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-100" style={{ fontSize: "0.95rem" }}>
                  You have a pending internship application
                </p>
                <p className="text-amber-800 dark:text-amber-200 mt-1" style={{ fontSize: "0.85rem" }}>
                  You cannot submit a new application while waiting for approval on your current one. Your application status is: <span className="font-semibold capitalize">{myApp.status}</span>
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-2 text-xs">
                  Once your current application is either <span className="font-semibold">approved</span>, <span className="font-semibold">rejected</span>, or <span className="font-semibold">completed</span>, you'll be able to submit a new application.
                </p>
              </div>
            </div>
          )}

          {/* Resume draft banner */}
          {hasSavedDraft && !hasPendingApplication && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Save className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-800" style={{ fontSize: "0.9rem" }}>
                  You have an unfinished application
                </p>
                <p className="text-amber-700 mt-0.5" style={{ fontSize: "0.8rem" }}>
                  Step {step} of 4 — your progress has been saved. Pick up where you left off.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={resumeDraft}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium flex items-center gap-1.5"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Continue Application
                  </button>
                  <button
                    onClick={clearDraft}
                    className="px-4 py-2 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-100 flex items-center gap-1.5"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Start Over
                  </button>
                </div>
              </div>
            </div>
          )}
          <TermWindowsList
            availableTerms={availableTerms}
            onSelectTerm={handleSelectTerm}
            onViewChange={setView}
            isBlocked={hasPendingApplication}
          />
        </div>
      )}

      {view === "apply" && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4 relative overflow-hidden">
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Submitting...</p>
              </div>
            </div>
          )}

          {/* Step indicator - compact horizontal */}
          <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto">
            {steps.map((s, idx) => {
              const active = step === s.num;
              const passed = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      active
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : passed
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {passed ? <CheckCircle2 className="w-3 h-3" /> : s.num}
                  </div>
                  {idx < steps.length - 1 && <div className="w-3 h-0.5 bg-border" />}
                </div>
              );
            })}
          </div>

          {/* Current step content */}
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

          {/* Navigation - full width on mobile */}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Step {step} of 4</p>
              {hasSavedDraft && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Save className="w-3 h-3" /> Draft saved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => (step === 1 ? setView("windows") : setStep((step - 1) as Step))}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-border rounded-lg hover:bg-accent font-medium text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Back" : "Prev"}
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => canProceed() && setStep((step + 1) as Step)}
                  disabled={!canProceed()}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Submit
                </button>
              )}
            </div>
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