import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { openPlacementLetter } from "../../lib/generate-placement-letter";
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
  const { user } = useAppContext();
  const [myApp, setMyApp] = useState<any | null>(null);

  useEffect(() => {
    apiClient.getApplications().then((res) => {
      if (res.success && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1);
        setMyApp(sorted[0]);
      }
    });
  }, []);

  // Supervisor magic link form
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [supervisorPhone, setSupervisorPhone] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const isApproved = myApp && ["approved", "active", "completed"].includes(myApp.status);
  const isActive = myApp?.status === "active";
  const isCompleted = myApp?.status === "completed";
  const needsAcceptance = myApp?.status === "approved";

  const handleDownloadPlacementLetter = () => {
    if (!myApp) return;
    openPlacementLetter({
      studentName: myApp.student?.user?.name ?? myApp.studentName ?? user?.name ?? "Student",
      studentId: myApp.student?.student_id ?? myApp.studentId ?? user?.studentId ?? "—",
      department: myApp.student?.department ?? myApp.department ?? user?.department ?? "—",
      level: myApp.student?.level ?? myApp.level ?? "—",
      companyName: myApp.company?.name ?? myApp.companyName ?? "Company",
      companyAddress: myApp.company?.address,
      supervisorName: myApp.academic_supervisor?.user?.name ?? myApp.supervisorAssigned,
      startDate: myApp.proposed_start_date,
      endDate: myApp.proposed_end_date,
    });
  };

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
      status: needsAcceptance ? "Action Required" : isApproved ? "Available" : "Pending",
      canDownload: !!isApproved,
      canUpload: false,
      icon: File,
    },
    {
      id: "final-report",
      name: "Final Internship Report",
      desc: "Your comprehensive final report documenting the internship experience, tasks, and learnings",
      status: isActive || isCompleted ? "Not Submitted" : "Not Available Yet",
      canDownload: false,
      canUpload: false,
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


  const handleSendMagicLink = async () => {
    if (!supervisorName.trim() || !supervisorEmail.trim()) {
      toast.error("Please provide supervisor name and email.");
      return;
    }
    const res = await apiClient.requestMagicLink(supervisorEmail);
    if (res.success) {
      setMagicLinkSent(true);
      toast.success(`Magic link sent to ${supervisorEmail}. Your supervisor can now access the system.`);
    } else {
      toast.error(res.message ?? "Failed to send magic link.");
    }
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
      {needsAcceptance && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800" style={{ fontSize: "0.9rem" }}>Action Required: Document Upload Coming Soon</p>
            <p className="text-amber-700 mt-1" style={{ fontSize: "0.8rem" }}>
              Your application has been approved. Document upload functionality will be available shortly. In the meantime,
              contact your DLO for the next steps.
            </p>
          </div>
        </div>
      )}

      {(isActive || isCompleted) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-800" style={{ fontSize: "0.9rem" }}>
              {isCompleted ? "Final Report Submission Coming Soon" : "Reminder: Final Report Submission"}
            </p>
            <p className="text-blue-700 mt-1" style={{ fontSize: "0.8rem" }}>
              {isCompleted
                ? "Your attachment is complete. Final report submission will be available shortly."
                : "Your final report will be due at the end of your attachment period. Submission tools coming soon."}
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
            </div>
            <div className="flex gap-2 shrink-0">
              {doc.canDownload && (
                <button
                  onClick={() => {
                    if (doc.id === "placement-letter" && isApproved) {
                      handleDownloadPlacementLetter();
                    } else {
                      toast.info(`${doc.name} download coming soon.`);
                    }
                  }}
                  disabled={doc.id !== "placement-letter" || !isApproved}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    doc.id === "placement-letter" && isApproved
                      ? "border border-primary text-primary hover:bg-primary/5"
                      : "border border-border text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                  style={{ fontSize: "0.8rem" }}
                  title={doc.id === "placement-letter" && isApproved ? "Download your placement letter" : "Coming soon"}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
              {doc.canUpload && (
                <button
                  disabled
                  className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-lg opacity-50 cursor-not-allowed flex items-center gap-1.5"
                  style={{ fontSize: "0.8rem" }}
                  title="Coming soon"
                >
                  <Upload className="w-3.5 h-3.5" /> Coming Soon
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

    </div>
  );
}