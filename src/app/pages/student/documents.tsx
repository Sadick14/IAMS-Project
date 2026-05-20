import { useState } from "react";
import { useAppContext } from "../../lib/context";
import { getLatestApplicationForStudent } from "../../lib/store";
import {
  Upload, FileText, Download, CheckCircle2, Clock, X, Eye,
  File, AlertTriangle, Link2, Send
} from "lucide-react";
import { toast } from "sonner";

interface UploadedDoc {
  name: string;
  size: string;
  uploadedAt: string;
}

export function DocumentsPage() {
  const { user, store } = useAppContext();
  const myApp = getLatestApplicationForStudent(user?.studentId || "");

  // Mock uploaded files state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDoc>>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Supervisor magic link form
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Final report form
  const [reportForm, setReportForm] = useState({
    title: "",
    abstract: "",
    fileName: "",
  });

  const isApproved = myApp && ["Approved", "Company Accepted", "Active", "Completed"].includes(myApp.status);
  const isActive = myApp?.status === "Active";
  const isCompleted = myApp?.status === "Completed";
  const needsAcceptance = myApp?.status === "Approved";

  const documents = [
    {
      id: "placement-letter",
      name: "Placement Letter",
      desc: "Official letter from the university to the company requesting student placement",
      status: isApproved ? "Available" : "Pending",
      canDownload: !!isApproved,
      canUpload: false,
      icon: FileText,
    },
    {
      id: "acceptance-form",
      name: "Company Acceptance Form",
      desc: "Form to be signed by the company confirming acceptance of the student",
      status: uploadedDocs["acceptance-form"]
        ? "Uploaded"
        : isApproved
          ? "Action Required"
          : "Pending",
      canDownload: !!isApproved,
      canUpload: !!needsAcceptance && !uploadedDocs["acceptance-form"],
      icon: File,
    },
    {
      id: "final-report",
      name: "Final Internship Report",
      desc: "Your comprehensive final report documenting the internship experience, tasks, and learnings",
      status: uploadedDocs["final-report"]
        ? "Submitted"
        : isActive || isCompleted
          ? "Not Submitted"
          : "Not Available Yet",
      canDownload: false,
      canUpload: (!!isActive || !!isCompleted) && !uploadedDocs["final-report"],
      icon: FileText,
    },
    {
      id: "logbook-export",
      name: "Logbook Export (PDF)",
      desc: "Auto-generated PDF of all your approved logbook entries",
      status: isActive || isCompleted ? "Available" : "Pending",
      canDownload: !!isActive || !!isCompleted,
      canUpload: false,
      icon: FileText,
    },
  ];

  const handleSimulateUpload = (docId: string, label: string) => {
    if (docId === "acceptance-form") {
      setShowAcceptanceModal(true);
    } else if (docId === "final-report") {
      setShowReportModal(true);
    } else {
      setUploadedDocs((prev) => ({
        ...prev,
        [docId]: { name: `${label}.pdf`, size: "1.2 MB", uploadedAt: new Date().toISOString() },
      }));
      toast.success(`${label} uploaded successfully.`);
    }
  };

  const handleAcceptanceSubmit = () => {
    setUploadedDocs((prev) => ({
      ...prev,
      "acceptance-form": { name: "Company_Acceptance_Form_Signed.pdf", size: "856 KB", uploadedAt: new Date().toISOString() },
    }));
    setShowAcceptanceModal(false);
    toast.success("Company acceptance form uploaded! Your DLO will be notified.");
  };

  const handleReportSubmit = () => {
    if (!reportForm.title.trim()) {
      toast.error("Please enter a report title.");
      return;
    }
    setUploadedDocs((prev) => ({
      ...prev,
      "final-report": { name: `Final_Report_${user?.studentId}.pdf`, size: "4.8 MB", uploadedAt: new Date().toISOString() },
    }));
    setShowReportModal(false);
    setReportForm({ title: "", abstract: "", fileName: "" });
    toast.success("Final report submitted successfully! Your academic supervisor will review it.");
  };

  const handleSendMagicLink = () => {
    if (!supervisorName.trim() || !supervisorEmail.trim()) {
      toast.error("Please provide supervisor name and email.");
      return;
    }
    setMagicLinkSent(true);
    toast.success(`Magic link sent to ${supervisorEmail}. Your supervisor can now access the system.`);
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Available": "bg-emerald-100 text-emerald-700",
      "Uploaded": "bg-emerald-100 text-emerald-700",
      "Submitted": "bg-emerald-100 text-emerald-700",
      "Action Required": "bg-red-100 text-red-700",
      "Not Submitted": "bg-amber-100 text-amber-700",
      "Not Available Yet": "bg-gray-100 text-gray-500",
      "Pending": "bg-gray-100 text-gray-500",
    };
    const icons: Record<string, React.ReactNode> = {
      "Available": <CheckCircle2 className="w-3 h-3" />,
      "Uploaded": <CheckCircle2 className="w-3 h-3" />,
      "Submitted": <CheckCircle2 className="w-3 h-3" />,
      "Action Required": <AlertTriangle className="w-3 h-3" />,
      "Not Submitted": <Clock className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${styles[status] || styles["Pending"]}`} style={{ fontSize: "0.7rem" }}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Documents</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Download, upload, and manage your internship documents
        </p>
      </div>

      {/* Workflow Progress Banner */}
      {needsAcceptance && !uploadedDocs["acceptance-form"] && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800" style={{ fontSize: "0.9rem" }}>Action Required: Upload Company Acceptance Form</p>
            <p className="text-amber-700 mt-1" style={{ fontSize: "0.8rem" }}>
              Your application has been approved. Download the Placement Letter, take it to your company for signing,
              then upload the signed Company Acceptance Form to proceed.
            </p>
          </div>
        </div>
      )}

      {(isActive || isCompleted) && !uploadedDocs["final-report"] && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-800" style={{ fontSize: "0.9rem" }}>
              {isCompleted ? "Required: Submit Final Report" : "Reminder: Final Report Submission"}
            </p>
            <p className="text-blue-700 mt-1" style={{ fontSize: "0.8rem" }}>
              {isCompleted
                ? "Your attachment is complete. Please submit your final report for grading."
                : "Your final report will be due at the end of your attachment period. You can submit it early."}
            </p>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className={`bg-card border rounded-xl p-5 flex items-start gap-4 ${
            doc.status === "Action Required" ? "border-red-200" : "border-border"
          }`}>
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              doc.status === "Available" || doc.status === "Uploaded" || doc.status === "Submitted"
                ? "bg-emerald-100"
                : doc.status === "Action Required"
                  ? "bg-red-100"
                  : "bg-secondary"
            }`}>
              <doc.icon className={`w-5 h-5 ${
                doc.status === "Available" || doc.status === "Uploaded" || doc.status === "Submitted"
                  ? "text-emerald-600"
                  : doc.status === "Action Required"
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p style={{ fontSize: "0.9rem" }}>{doc.name}</p>
                {statusBadge(doc.status)}
              </div>
              <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground">{doc.desc}</p>

              {/* Show uploaded file details */}
              {uploadedDocs[doc.id] && (
                <div className="mt-2 flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
                  <File className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p style={{ fontSize: "0.8rem" }}>{uploadedDocs[doc.id].name}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                      {uploadedDocs[doc.id].size} · Uploaded {new Date(uploadedDocs[doc.id].uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(doc.id)}
                    className="ml-auto text-primary hover:underline flex items-center gap-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {doc.canDownload && (
                <button
                  onClick={() => toast.success(`${doc.name} downloaded.`)}
                  className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent flex items-center gap-1.5 text-muted-foreground"
                  style={{ fontSize: "0.8rem" }}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
              {doc.canUpload && (
                <button
                  onClick={() => handleSimulateUpload(doc.id, doc.name)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-1.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Industry Supervisor Magic Link Section */}
      {(needsAcceptance || isActive) && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h3>Industry Supervisor Access</h3>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Provide your industry supervisor's details to send them a magic link for system access. They'll use this to review your logbook entries and submit evaluations.
          </p>

          {magicLinkSent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-emerald-800" style={{ fontSize: "0.85rem" }}>Magic link sent to {supervisorEmail}</p>
                <p className="text-emerald-600" style={{ fontSize: "0.75rem" }}>
                  {supervisorName} can now access the system. The link expires in 30 days.
                </p>
              </div>
              <button
                onClick={() => { setMagicLinkSent(false); setSupervisorName(""); setSupervisorEmail(""); setSupervisorPhone(""); }}
                className="ml-auto text-emerald-600 hover:underline"
                style={{ fontSize: "0.75rem" }}
              >
                Resend
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label style={{ fontSize: "0.8rem" }}>Supervisor Name *</label>
                <input type="text" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="e.g., Mr. Kwame Asante" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Supervisor Email *</label>
                <input type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="e.g., k.asante@company.com" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem" }}>Supervisor Phone</label>
                <input type="tel" value={supervisorPhone} onChange={(e) => setSupervisorPhone(e.target.value)}
                  placeholder="+233..." className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>
              <div className="md:col-span-3">
                <button
                  onClick={handleSendMagicLink}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Send className="w-4 h-4" /> Send Magic Link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Company Acceptance Upload Modal */}
      {showAcceptanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3>Upload Company Acceptance Form</h3>
              <button onClick={() => setShowAcceptanceModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-blue-800" style={{ fontSize: "0.8rem" }}>
                  Upload the company acceptance form signed by your company supervisor/HR. Accepted formats: PDF, JPG, PNG. Max size: 10MB.
                </p>
              </div>

              {/* Simulated file drop zone */}
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p style={{ fontSize: "0.85rem" }}>Click to browse or drag & drop your file here</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.75rem" }}>PDF, JPG, PNG · Max 10MB</p>
              </div>

              {/* Simulated selected file */}
              <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
                <File className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p style={{ fontSize: "0.85rem" }}>Company_Acceptance_Form_Signed.pdf</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>856 KB</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowAcceptanceModal(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>
                Cancel
              </button>
              <button onClick={handleAcceptanceSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                <Upload className="w-4 h-4" /> Upload Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Report Submission Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3>Submit Final Report</h3>
              <button onClick={() => setShowReportModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-blue-800" style={{ fontSize: "0.8rem" }}>
                  Your final report will be reviewed by your academic supervisor and factored into your final grade. Ensure it follows the HTU Industrial Attachment report template.
                </p>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem" }}>Report Title *</label>
                <input type="text" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="e.g., Industrial Attachment Report - Ghana Telecom Ltd"
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem" }}>Abstract / Summary</label>
                <textarea value={reportForm.abstract} onChange={(e) => setReportForm({ ...reportForm, abstract: e.target.value })}
                  placeholder="Brief summary of your attachment experience (200-300 words)..."
                  rows={4} className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background" style={{ fontSize: "0.85rem" }} />
              </div>

              {/* Simulated file drop zone */}
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p style={{ fontSize: "0.85rem" }}>Upload Final Report (PDF only)</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.75rem" }}>Max 25MB</p>
              </div>

              {/* Simulated file */}
              <div className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2">
                <File className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p style={{ fontSize: "0.85rem" }}>Final_Report_{user?.studentId}.pdf</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>4.8 MB</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>
                Cancel
              </button>
              <button onClick={handleReportSubmit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                <Upload className="w-4 h-4" /> Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3>Document Preview</h3>
              <button onClick={() => setShowPreview(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6 text-center space-y-4">
              <File className="w-16 h-16 text-primary mx-auto" />
              <div>
                <p style={{ fontSize: "0.9rem" }}>{uploadedDocs[showPreview]?.name}</p>
                <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
                  {uploadedDocs[showPreview]?.size} · Uploaded {uploadedDocs[showPreview] ? new Date(uploadedDocs[showPreview].uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-6">
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                  Document preview would render here in production. PDF viewer integration required.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button onClick={() => setShowPreview(null)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}