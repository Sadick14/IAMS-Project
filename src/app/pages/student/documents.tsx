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
    const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
    const companyAddress = typeof myApp.company?.address === "string" ? myApp.company.address : undefined;
    const supervisorName = typeof myApp.academic_supervisor?.user?.name === "string" ? myApp.academic_supervisor.user.name : (typeof myApp.supervisorAssigned === "string" ? myApp.supervisorAssigned : undefined);

    openPlacementLetter({
      studentName: myApp.student?.user?.name ?? myApp.studentName ?? user?.name ?? "Student",
      studentId: myApp.student?.student_id ?? myApp.studentId ?? user?.studentId ?? "—",
      department: myApp.student?.department ?? myApp.department ?? user?.department ?? "—",
      level: myApp.student?.level ?? myApp.level ?? "—",
      companyName,
      companyAddress,
      supervisorName,
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage documents</p>
      </div>

      {/* Workflow Progress Banner */}
      {needsAcceptance && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">Action Required</p>
            <p className="text-amber-700 text-xs mt-1">
              Document upload coming soon. Contact your DLO.
            </p>
          </div>
        </div>
      )}

      {(isActive || isCompleted) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <FileText className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-800 font-semibold text-sm">
              {isCompleted ? "Internship Completed" : "Final Report Due"}
            </p>
            <p className="text-blue-700 text-xs mt-1">
              {isCompleted
                ? "Final report submission coming soon."
                : "Submission tools coming soon."}
            </p>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className={`bg-card border rounded-lg p-3 space-y-2 ${
            doc.status === "Action Required" ? "border-red-200" : "border-border"
          }`}>
            <div className="flex items-start gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                doc.status === "Available" || doc.status === "Uploaded" || doc.status === "Submitted"
                  ? "bg-emerald-100"
                  : doc.status === "Action Required"
                    ? "bg-red-100"
                    : "bg-secondary"
              }`}>
                <doc.icon className={`w-4 h-4 ${
                  doc.status === "Available" || doc.status === "Uploaded" || doc.status === "Submitted"
                    ? "text-emerald-600"
                    : doc.status === "Action Required"
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{doc.name}</p>
                {statusBadge(doc.status)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 ml-11">{doc.desc}</p>
            {(doc.canDownload || doc.canUpload) && (
              <div className="flex gap-2 ml-11">
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
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      doc.id === "placement-letter" && isApproved
                        ? "border border-primary text-primary hover:bg-primary/5"
                        : "border border-border text-muted-foreground opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
                {doc.canUpload && (
                  <button
                    disabled
                    className="px-2.5 py-1 bg-secondary text-muted-foreground rounded text-xs opacity-50 cursor-not-allowed flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> Coming
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Industry Supervisor Magic Link Section */}
      {(needsAcceptance || isActive) && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Supervisor Access</h3>
          </div>
          <p className="text-muted-foreground text-xs">
            Send a magic link to your supervisor for system access.
          </p>

          {magicLinkSent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-800 text-xs font-medium">Link sent</p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  {supervisorName} can access the system. Link expires in 30 days.
                </p>
              </div>
              <button
                onClick={() => { setMagicLinkSent(false); setSupervisorName(""); setSupervisorEmail(""); setSupervisorPhone(""); }}
                className="ml-auto text-emerald-600 hover:underline text-xs font-medium shrink-0"
              >
                Resend
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Name *</label>
                <input type="text" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="Supervisor name" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Email *</label>
                <input type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="supervisor@company.com" className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <input type="tel" value={supervisorPhone} onChange={(e) => setSupervisorPhone(e.target.value)}
                  placeholder="+233..." className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-sm" />
              </div>
              <button
                onClick={handleSendMagicLink}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Send className="w-4 h-4" /> Send Link
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}