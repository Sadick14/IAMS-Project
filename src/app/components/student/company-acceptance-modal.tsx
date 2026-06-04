import { useState } from "react";
import { X, Upload, AlertCircle } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  companyName: string;
  proposedStartDate?: string;
  proposedEndDate?: string;
}

export function CompanyAcceptanceModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  companyName,
  proposedStartDate,
  proposedEndDate,
}: Props) {
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorTitle, setSupervisorTitle] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [confirmedStartDate, setConfirmedStartDate] = useState(proposedStartDate ?? "");
  const [confirmedEndDate, setConfirmedEndDate] = useState(proposedEndDate ?? "");
  const [studentRole, setStudentRole] = useState("");
  const [placementDepartment, setPlacementDepartment] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = supervisorName.trim() && supervisorTitle.trim() && supervisorEmail.trim() &&
    supervisorPhone.trim() && confirmedStartDate && confirmedEndDate && studentRole.trim() &&
    placementDepartment.trim();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!uploadedFile) {
      toast.error("Please upload the signed acceptance form");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.submitCompanyAcceptance(
        applicationId,
        {
          industry_supervisor_name: supervisorName,
          industry_supervisor_title: supervisorTitle,
          industry_supervisor_email: supervisorEmail,
          industry_supervisor_phone: supervisorPhone,
          confirmed_start_date: confirmedStartDate,
          confirmed_end_date: confirmedEndDate,
          student_role: studentRole,
          placement_department: placementDepartment,
          acceptance_notes: `Company accepted. Student role: ${studentRole} in ${placementDepartment}. Supervisor: ${supervisorName} (${supervisorTitle}).`,
        },
        uploadedFile
      );

      if (res.success) {
        toast.success("Company acceptance submitted successfully! Your internship is now active.");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message ?? "Failed to submit acceptance");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An error occurred while submitting");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 style={{ fontSize: "1.3rem" }} className="font-bold">
              Company Acceptance Form
            </h2>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
              Fill in company details and upload the signed acceptance form
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Company Info */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Company:</strong> {companyName}
            </p>
            {proposedStartDate && (
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                <strong>Proposed Period:</strong> {proposedStartDate}
                {proposedEndDate && ` to ${proposedEndDate}`}
              </p>
            )}
          </div>

          {/* Section 1: Supervisor Details */}
          <div className="space-y-4">
            <h3 style={{ fontSize: "0.95rem" }} className="font-semibold">
              Industry Supervisor Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="e.g., John Appiah"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={supervisorTitle}
                  onChange={(e) => setSupervisorTitle(e.target.value)}
                  placeholder="e.g., Senior Engineer"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="supervisor@company.com"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={supervisorPhone}
                  onChange={(e) => setSupervisorPhone(e.target.value)}
                  placeholder="e.g., +233 50 123 4567"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Confirmed Dates */}
          <div className="space-y-4">
            <h3 style={{ fontSize: "0.95rem" }} className="font-semibold">
              Confirmed Attachment Period
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={confirmedStartDate}
                  onChange={(e) => setConfirmedStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={confirmedEndDate}
                  onChange={(e) => setConfirmedEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Placement Details */}
          <div className="space-y-4">
            <h3 style={{ fontSize: "0.95rem" }} className="font-semibold">
              Placement Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Student Role / Position *
                </label>
                <input
                  type="text"
                  value={studentRole}
                  onChange={(e) => setStudentRole(e.target.value)}
                  placeholder="e.g., Software Developer Intern"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }} className="block text-muted-foreground font-medium mb-1">
                  Department / Unit *
                </label>
                <input
                  type="text"
                  value={placementDepartment}
                  onChange={(e) => setPlacementDepartment(e.target.value)}
                  placeholder="e.g., IT Department"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: File Upload */}
          <div className="space-y-4">
            <h3 style={{ fontSize: "0.95rem" }} className="font-semibold">
              Upload Signed Acceptance Form
            </h3>
            <p className="text-muted-foreground text-sm">
              Upload a scan or photo of the signed acceptance form from the company. Max 10MB (PDF or Image).
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {uploadedFile ? uploadedFile.name : "Click to select file or drag & drop"}
                </span>
                {uploadedFile && <span className="text-xs text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">Before submitting:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                <li>Ensure all supervisor details are correct and match the company records</li>
                <li>Confirm the attachment dates with your supervisor</li>
                <li>Have the company sign and scan/photo the acceptance form</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2 border border-border rounded-lg hover:bg-accent font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || !uploadedFile || isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            {isSubmitting ? "Submitting..." : "Submit Acceptance"}
          </button>
        </div>
      </div>
    </div>
  );
}
