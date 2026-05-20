import { Phone, Upload, CheckCircle2 } from "lucide-react";

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

interface PersonalDetailsFormProps {
  form: FormData;
  updateForm: (updates: Partial<FormData>) => void;
  user: any;
}

export function PersonalDetailsForm({ form, updateForm, user }: PersonalDetailsFormProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3>Your Details & Documents</h3>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
          Provide contact information and optionally upload supporting documents.
        </p>
      </div>

      {/* Auto-filled profile data */}
      <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
        <p className="text-muted-foreground font-semibold uppercase tracking-wider" style={{ fontSize: "0.65rem" }}>
          AUTO-FILLED FROM PROFILE
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Full Name", user?.name || ""],
            ["Student ID", user?.studentId || ""],
            ["Department", user?.department || ""],
            ["Email", user?.email || ""],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {label}
              </p>
              <p style={{ fontSize: "0.85rem" }} className="font-medium">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label style={{ fontSize: "0.8rem" }}>Phone Number *</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => updateForm({ phoneNumber: e.target.value })}
              placeholder="+233..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem" }}>Preferred Start Date</label>
          <input
            type="date"
            value={form.preferredStartDate}
            onChange={(e) => updateForm({ preferredStartDate: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.8rem" }}>Emergency Contact Name *</label>
          <input
            type="text"
            value={form.emergencyContact}
            onChange={(e) => updateForm({ emergencyContact: e.target.value })}
            placeholder="e.g., Mrs. Akua Doe"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.8rem" }}>Emergency Contact Phone *</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => updateForm({ emergencyPhone: e.target.value })}
              placeholder="+233..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label style={{ fontSize: "0.8rem" }}>Additional Notes</label>
          <textarea
            value={form.additionalNotes}
            onChange={(e) => updateForm({ additionalNotes: e.target.value })}
            placeholder="Any special requirements, health concerns, or other relevant information..."
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
      </div>

      {/* Optional Document Uploads */}
      <div className="border-t border-border pt-5">
        <h4 className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4 text-primary" />
          Optional Supporting Documents
        </h4>
        <p className="text-muted-foreground mb-4" style={{ fontSize: "0.8rem" }}>
          You may upload a CV and/or motivation letter to strengthen your application. These are not required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* CV Upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
              form.uploadCV ? "border-emerald-400 bg-emerald-50" : "border-border hover:border-primary/40 bg-card"
            }`}
            onClick={() => updateForm({ uploadCV: !form.uploadCV })}
          >
            {form.uploadCV ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p style={{ fontSize: "0.85rem" }} className="text-emerald-700 font-medium">
                  CV_{user?.name?.replace(/\s+/g, "_") || "student"}.pdf
                </p>
                <p className="text-emerald-600 mt-1 animate-pulse" style={{ fontSize: "0.7rem" }}>
                  Click to remove
                </p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p style={{ fontSize: "0.85rem" }} className="font-medium text-foreground">
                  Upload CV / Resume
                </p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>
                  PDF, DOC · Max 5MB
                </p>
              </>
            )}
          </div>

          {/* Motivation Letter Upload */}
          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
              form.uploadMotivation ? "border-emerald-400 bg-emerald-50" : "border-border hover:border-primary/40 bg-card"
            }`}
            onClick={() => updateForm({ uploadMotivation: !form.uploadMotivation })}
          >
            {form.uploadMotivation ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p style={{ fontSize: "0.85rem" }} className="text-emerald-700 font-medium">
                  Motivation_Letter.pdf
                </p>
                <p className="text-emerald-600 mt-1 animate-pulse" style={{ fontSize: "0.7rem" }}>
                  Click to remove
                </p>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p style={{ fontSize: "0.85rem" }} className="font-medium text-foreground">
                  Upload Motivation Letter
                </p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.7rem" }}>
                  PDF, DOC · Max 5MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
