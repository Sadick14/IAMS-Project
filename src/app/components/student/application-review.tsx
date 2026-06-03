import { FileText } from "lucide-react";

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

interface ApplicationReviewProps {
  form: FormData;
  updateForm: (updates: Partial<FormData>) => void;
  user: any;
  selectedTerm: any;
  selectedCompany: any;
  selectedBranch: any;
}

export function ApplicationReview({
  form,
  updateForm,
  user,
  selectedTerm,
  selectedCompany,
  selectedBranch,
}: ApplicationReviewProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3>Review Your Application</h3>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
          Please review all details before submitting. You won't be able to edit after submission.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontSize: "0.65rem" }}>
            Internship Window
          </p>
          <p style={{ fontSize: "0.9rem" }} className="font-medium">
            {selectedTerm?.name || "—"}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            {selectedTerm?.type} · {selectedTerm?.internshipStart} → {selectedTerm?.internshipEnd}
          </p>
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontSize: "0.65rem" }}>
            Company
          </p>
          {form.companyChoice === "existing" ? (
            <>
              <p style={{ fontSize: "0.9rem" }} className="font-medium">
                {selectedCompany?.name || "—"}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                {selectedCompany?.contact_person_name || selectedCompany?.contactPerson || "—"} · {selectedCompany?.contact_person_email || selectedCompany?.contactEmail || "—"}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "0.9rem" }} className="font-medium">
                {form.newCompanyName}{" "}
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs" style={{ fontSize: "0.65rem" }}>
                  PENDING APPROVAL
                </span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                {form.newCompanyContactPerson} · {form.newCompanyContactEmail}
              </p>
            </>
          )}
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontSize: "0.65rem" }}>
            Branch
          </p>
          {form.branchChoice === "existing" && selectedBranch ? (
            <>
              <p style={{ fontSize: "0.9rem" }} className="font-medium">
                {selectedBranch.name}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                {selectedBranch.location}, {selectedBranch.region}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {selectedBranch.address} · {selectedBranch.telephone}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "0.9rem" }} className="font-medium">
                {form.newBranchName}{" "}
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs" style={{ fontSize: "0.65rem" }}>
                  PENDING
                </span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                {form.newBranchLocation}, {form.newBranchRegion}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {form.newBranchAddress} · {form.newBranchTelephone}
              </p>
            </>
          )}
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontSize: "0.65rem" }}>
            Student
          </p>
          <p style={{ fontSize: "0.9rem" }} className="font-medium">
            {user?.name}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            {user?.studentId} · {user?.department} · {form.phoneNumber}
          </p>
        </div>

        <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
          <p className="text-muted-foreground uppercase tracking-wider font-semibold" style={{ fontSize: "0.65rem" }}>
            Emergency Contact
          </p>
          <p style={{ fontSize: "0.9rem" }} className="font-medium">
            {form.emergencyContact}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            {form.emergencyPhone}
          </p>
        </div>
      </div>

      {/* Documents Summary */}
      {(form.uploadCV || form.uploadMotivation) && (
        <div className="bg-secondary/30 rounded-xl p-4 bg-card border border-border">
          <p className="text-muted-foreground uppercase tracking-wider mb-2 font-semibold" style={{ fontSize: "0.65rem" }}>
            Attached Documents
          </p>
          <div className="flex gap-3">
            {form.uploadCV && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg" style={{ fontSize: "0.8rem" }}>
                <FileText className="w-3.5 h-3.5 text-primary" /> CV_{user?.name?.replace(/\s+/g, "_") || "student"}.pdf
              </span>
            )}
            {form.uploadMotivation && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg" style={{ fontSize: "0.8rem" }}>
                <FileText className="w-3.5 h-3.5 text-primary" /> Motivation_Letter.pdf
              </span>
            )}
          </div>
        </div>
      )}

      {form.additionalNotes && (
        <div className="bg-secondary/30 rounded-xl p-4">
          <p className="text-muted-foreground uppercase tracking-wider mb-1 font-semibold" style={{ fontSize: "0.65rem" }}>
            Additional Notes
          </p>
          <p style={{ fontSize: "0.85rem" }}>{form.additionalNotes}</p>
        </div>
      )}

      {/* What happens next */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 mb-2 font-semibold" style={{ fontSize: "0.85rem" }}>
          What happens after submission:
        </p>
        <ol className="text-blue-700 space-y-1 list-decimal list-inside" style={{ fontSize: "0.8rem" }}>
          <li>
            Your application status will be set to <strong>"Pending Departmental Review"</strong>
          </li>
          <li>Your DLO will be notified and will review your application</li>
          {form.companyChoice === "new" && (
            <li>Your new company will be reviewed and approved/rejected separately</li>
          )}
          <li>
            You can track your application status in the <strong>"My Application"</strong> tab
          </li>
        </ol>
      </div>

      {/* Terms Agreement */}
      <div className="border border-border rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreeToTerms}
            onChange={(e) => updateForm({ agreeToTerms: e.target.checked })}
            className="accent-primary w-5 h-5 mt-0.5 shrink-0"
          />
          <span className="text-foreground select-none" style={{ fontSize: "0.85rem" }}>
            I confirm that all information provided is accurate and complete. I understand that providing false information may result in my application being rejected. I agree to follow the Industrial Attachment guidelines set by Ho Technical University.
          </span>
        </label>
      </div>
    </div>
  );
}
