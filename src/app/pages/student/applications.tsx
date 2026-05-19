import { useState, useMemo } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useToastAction } from "../../lib/hooks";
import { ghanaRegions } from "../../lib/mock-data";
import { findCompanyByName, findBranchByName } from "../../services/company-service";
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
  const { user, store } = useAppContext();

  // Pick the most recent application for this student
  const myApp = useMemo(() => {
    const mine = store.applications.filter((a) => a.studentId === user?.studentId);
    if (mine.length === 0) return undefined;
    return [...mine].sort((a, b) => b.dateApplied.localeCompare(a.dateApplied))[0];
  }, [store.applications, user?.studentId]);

  const [view, setView] = useState<View>(myApp ? "tracker" : "windows");
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const { execute: submitAction, loading: isSubmitting } = useToastAction();

  // STU-01: Open internship windows
  const availableTerms = store.terms.filter(
    (t) => t.status === "Active" || t.status === "Upcoming"
  );

  const selectedTerm = store.terms.find((t) => t.id === form.termId);
  const selectedCompany = store.companies.find((c) => c.id === form.selectedCompanyId);
  const selectedBranch = store.branches.find((b) => b.id === form.selectedBranchId);

  const updateForm = (updates: Partial<FormData>) => setForm((prev) => ({ ...prev, ...updates }));

  // STU-02: Eligibility check
  const checkEligibility = (termId: string): boolean => {
    const term = store.terms.find((t) => t.id === termId);
    if (!term) return false;

    // Check level eligibility
    const studentLevel =
      user?.studentId?.startsWith("CS") ||
      user?.studentId?.startsWith("EE") ||
      user?.studentId?.startsWith("ME") ||
      user?.studentId?.startsWith("CE") ||
      user?.studentId?.startsWith("BA") ||
      user?.studentId?.startsWith("AF")
        ? "L300"
        : "L200";

    if (!term.eligibleLevels.includes(studentLevel)) {
      setEligibilityError(
        `You are currently at ${studentLevel} but this term requires ${term.eligibleLevels.join(
          ", "
        )}. You are not eligible for this internship window.`
      );
      return false;
    }

    // Check department eligibility
    if (user?.department && !term.departments.includes(user.department)) {
      setEligibilityError(
        `Your department (${
          user.department
        }) is not eligible for this term. Eligible departments: ${term.departments.join(", ")}.`
      );
      return false;
    }

    // Check application window
    const today = new Date().toISOString().split("T")[0];
    if (today < term.applicationStart) {
      setEligibilityError(`The application window has not opened yet. It opens on ${term.applicationStart}.`);
      return false;
    }
    if (today > term.applicationEnd) {
      setEligibilityError(`The application window has closed. It ended on ${term.applicationEnd}.`);
      return false;
    }

    // Check for existing active application
    if (myApp && !["Completed", "Rejected"].includes(myApp.status)) {
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
            const hasDuplicateBranch = form.selectedCompanyId && form.newBranchName.trim()
              ? !!findBranchByName(form.selectedCompanyId, form.newBranchName)
              : false;
            return !!(
              form.newBranchName &&
              form.newBranchRegion &&
              form.newBranchLocation &&
              form.newBranchAddress &&
              form.newBranchTelephone &&
              !hasDuplicateBranch
            );
          }
          return false;
        }
        if (form.companyChoice === "new") {
          const hasDuplicateCompany = form.newCompanyName.trim()
            ? !!findCompanyByName(form.newCompanyName)
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

  // STU-06: Submit application via async transaction
  const handleSubmit = async () => {
    await submitAction(
      async () => {
        let companyId = "";
        let companyName = "";
        let branchId = "";
        let branchName = "";
        let companyStatus: "Approved" | "Pending" = "Approved";
        const actor = user?.name || "Student";

        if (form.companyChoice === "existing") {
          const company = store.companies.find((c) => c.id === form.selectedCompanyId);
          if (!company) {
            return { success: false, data: null, message: "Selected company not found." };
          }
          companyId = company.id;
          companyName = company.name;
          companyStatus = company.status === "Approved" ? "Approved" : "Pending";

          if (form.branchChoice === "existing") {
            const branch = store.branches.find((b) => b.id === form.selectedBranchId);
            if (!branch) {
              return { success: false, data: null, message: "Selected branch not found." };
            }
            branchId = branch.id;
            branchName = branch.name;
          } else {
            // Create new branch under existing company asynchronously
            const branchRes = await apiClient.createBranch({
              companyId: company.id,
              name: form.newBranchName,
              region: form.newBranchRegion,
              location: form.newBranchLocation,
              address: form.newBranchAddress,
              telephone: form.newBranchTelephone,
              addedBy: actor,
              autoApprove: false,
            });
            if (!branchRes.success || !branchRes.data) {
              return { success: false, data: null, message: branchRes.message || "Failed to create branch." };
            }
            branchId = branchRes.data.id;
            branchName = branchRes.data.name;
          }
        } else {
          // Create brand new company + branch atomically asynchronously
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
          companyName = companyRes.data.company.name;
          branchId = companyRes.data.branch.id;
          branchName = companyRes.data.branch.name;
          companyStatus = "Pending";
        }

        // Now submit the application using the resolved ids
        const newApp = {
          termId: form.termId,
          studentName: user?.name || "",
          studentId: user?.studentId || "",
          department: user?.department || "",
          level: "L300",
          companyId,
          companyName,
          branchId,
          branchName,
          companyStatus,
          status: "Pending" as const,
          phoneNumber: form.phoneNumber,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
          preferredStartDate: form.preferredStartDate,
          additionalNotes: form.additionalNotes,
          uploadCV: form.uploadCV,
          uploadMotivation: form.uploadMotivation,
        };

        const submitRes = await apiClient.createApplication(newApp);
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
        {/* Tab Switcher */}
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

      {/* VIEW: OPEN WINDOWS (STU-01) */}
      {view === "windows" && (
        <TermWindowsList
          availableTerms={availableTerms}
          onSelectTerm={handleSelectTerm}
          onViewChange={setView}
        />
      )}

      {/* VIEW: APPLY FLOW */}
      {view === "apply" && (
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6 relative overflow-hidden">
          {/* Global Loading Overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Submitting application...</p>
              </div>
            </div>
          )}

          {/* Stepper Progress bar */}
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
                store={store}
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

          {/* Navigation Buttons */}
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

      {/* VIEW: TRACKER */}
      {view === "tracker" && (
        <ApplicationTracker
          myApp={myApp}
          store={store}
          onViewWindows={() => setView("windows")}
        />
      )}
    </div>
  );
}
