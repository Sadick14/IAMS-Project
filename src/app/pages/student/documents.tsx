import { useState, useEffect, useRef } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { openPlacementLetter } from "../../lib/generate-placement-letter";
import { downloadCompanyAcceptanceFormPDF } from "../../lib/generate-company-acceptance-form";
import { exportLogbookToPDF } from "../../lib/logbook-export";
import { CompanyAcceptanceModal } from "../../components/student/company-acceptance-modal";
import { DocumentUploadModal } from "../../components/student/document-upload-modal";
import { InviteSupervisorModal } from "../../components/student/invite-supervisor-modal";
import {
  Upload, FileText, Download, CheckCircle2, Clock, X, Eye,
  File, AlertTriangle, Send
} from "lucide-react";
import { toast } from "sonner";

export function DocumentsPage() {
  const { user } = useAppContext();
  const [myApp, setMyApp] = useState<any | null>(null);
  const [internshipId, setInternshipId] = useState<string | null>(null);
  const [currentCompanyName, setCurrentCompanyName] = useState<string>("Company");

  // Modals state
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false);
  const [isReportUploadOpen, setIsReportUploadOpen] = useState(false);
  const [isInviteSupervisorOpen, setIsInviteSupervisorOpen] = useState(false);

  // Loading state for download button feedback
  const [isDownloadingForm, setIsDownloadingForm] = useState(false);

  // Simulated local state for uploaded final report name (survives reload)
  const [finalReportName, setFinalReportName] = useState<string | null>(() => {
    try {
      return localStorage.getItem("iams_final_report_name");
    } catch {
      return null;
    }
  });

  const fetchApplicationData = () => {
    apiClient.getApplications().then((res) => {
      if (res.success && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1);
        setMyApp(sorted[0]);
      }
    });

    apiClient.getInternships().then((res) => {
      if (res.success && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1);
        setInternshipId(String(sorted[0].id));
        setCurrentCompanyName(sorted[0].company?.name || sorted[0].companyName || "Company");
      }
    });
  };

  useEffect(() => {
    fetchApplicationData();
  }, []);

  // Supervisor details from uploaded form
  const [uploadedSupervisorName, setUploadedSupervisorName] = useState<string>("");
  const [uploadedSupervisorEmail, setUploadedSupervisorEmail] = useState<string>("");
  const [uploadedSupervisorPhone, setUploadedSupervisorPhone] = useState<string>("");
  const [uploadedSupervisorTitle, setUploadedSupervisorTitle] = useState<string>("");
  const [supervisorInviteSent, setSupervisorInviteSent] = useState(false);


  const isApproved = !!(myApp?.status && ["approved", "active", "completed", "company accepted", "company_accepted"].includes(myApp.status.toLowerCase()));
  const isActive = myApp?.status?.toLowerCase() === "active";
  const isCompleted = myApp?.status?.toLowerCase() === "completed";
  const needsAcceptance = myApp?.status?.toLowerCase() === "approved";

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

  // FIXED: Removed popup constraint check and wrapped parameter parser safely
  const handleDownloadAcceptanceForm = async () => {
    if (!myApp) {
      toast.error("No active application data found to generate form.");
      return;
    }

    setIsDownloadingForm(true);
    const toastId = toast.loading("Preparing your acceptance form download...");

    try {
      const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
      const companyAddress = typeof myApp.company?.address === "string" ? myApp.company.address : undefined;
      
      // Safe resolution for department object or string variants
      const deptRaw = myApp.student?.department?.name ?? myApp.student?.department ?? myApp.department ?? user?.department ?? "____________________";
      const departmentString = typeof deptRaw === "object" && deptRaw !== null ? deptRaw.name : String(deptRaw);

      // Fire down the generator utility
      await downloadCompanyAcceptanceFormPDF({
        studentName: myApp.student?.user?.name ?? myApp.studentName ?? user?.name ?? "Student",
        studentId: myApp.student?.student_id ?? myApp.studentId ?? user?.studentId ?? "____________________",
        department: departmentString,
        level: myApp.student?.level ?? myApp.level ?? "____________________",
        companyName,
        companyAddress,
        startDate: myApp.proposed_start_date,
        endDate: myApp.proposed_end_date,
      });

      toast.success("Acceptance Form downloaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Download pipeline error:", error);
      toast.error("Could not complete document export. Please check application data.", { id: toastId });
    } finally {
      setIsDownloadingForm(false);
    }
  };

  const handleDownloadLogbookPDF = async () => {
    if (!internshipId) {
      toast.error("No active/completed internship found for logbook export.");
      return;
    }
    const toastId = toast.loading("Generating logbook export PDF...");
    try {
      const res = await apiClient.getInternshipLogbooks(internshipId, { per_page: 100 });
      toast.dismiss(toastId);
      if (res.success) {
        exportLogbookToPDF(currentCompanyName, res.data ?? []);
        toast.success("Logbook PDF generated successfully!");
      } else {
        toast.error("Failed to load logbook entries.");
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("An error occurred while generating PDF.");
    }
  };

  const handleFinalReportSuccess = (fileName: string) => {
    setFinalReportName(fileName);
    try {
      localStorage.setItem("iams_final_report_name", fileName);
    } catch (e) {
      console.error(e);
    }
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
      desc: "Form to be signed by the company confirming acceptance of the student. After download, share with your supervisor and invite them to the system.",
      status: (myApp?.status?.toLowerCase() === "company accepted" || myApp?.status?.toLowerCase() === "company_accepted" || isActive || isCompleted)
        ? "Uploaded"
        : needsAcceptance
          ? "Action Required"
          : isApproved
            ? "Available"
            : "Pending",
      canDownload: !!myApp,
      canUpload: needsAcceptance,
      icon: File,
    },
    {
      id: "final-report",
      name: "Final Internship Report",
      desc: "Your comprehensive final report documenting the internship experience, tasks, and learnings",
      status: finalReportName 
        ? "Submitted" 
        : (isActive || isCompleted ? "Not Submitted" : "Not Available Yet"),
      canDownload: !!finalReportName,
      canUpload: isActive || isCompleted,
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

  const sendSupervisorInvite = async (name: string, email: string, phone?: string, title?: string) => {
    if (!name.trim() || !email.trim()) {
      return false;
    }

    const companyName = typeof myApp?.company?.name === "string" ? myApp.company.name : (typeof myApp?.companyName === "string" ? myApp.companyName : undefined);
    const studentName = myApp?.student?.user?.name ?? myApp?.studentName ?? user?.name;

    try {
      const res = await apiClient.requestMagicLink(email, {
        role: "industry_supervisor",
        name,
        phone: phone || undefined,
        job_title: title || undefined,
        application_id: myApp?.id,
        company_name: companyName,
        student_name: studentName,
      });

      if (res.success) {
        setUploadedSupervisorName(name);
        setUploadedSupervisorEmail(email);
        setUploadedSupervisorPhone(phone || "");
        setUploadedSupervisorTitle(title || "");
        setSupervisorInviteSent(true);
        toast.success(`Supervisor invite sent to ${email}!`);
        return true;
      } else {
        toast.error(res.message ?? "Failed to send supervisor invite.");
        return false;
      }
    } catch (error) {
      console.error("Error sending supervisor invite:", error);
      toast.error("Failed to send supervisor invite.");
      return false;
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800 font-semibold text-sm">Action Required</p>
            <p className="text-amber-700 text-xs mt-1">
              Please upload your signed Company Acceptance Form to verify and start your internship.
            </p>
          </div>
        </div>
      )}

      {(isActive || isCompleted) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <FileText className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-800 font-semibold text-sm">
              {isCompleted ? "Internship Completed" : "Final Report Due"}
            </p>
            <p className="text-blue-700 text-xs mt-1">
              {finalReportName 
                ? "Your final internship report has been uploaded."
                : "Please upload your comprehensive final report below before the term ends."}
            </p>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className={`bg-card border rounded-lg p-3 space-y-2 transition-all ${
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
                <p className="font-medium text-sm text-foreground">{doc.name}</p>
                {statusBadge(doc.status)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 ml-11">{doc.desc}</p>
            
            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-11">
              {doc.id === "acceptance-form" && doc.canDownload ? (
                <>
                  <button
                    onClick={handleDownloadAcceptanceForm}
                    disabled={isDownloadingForm}
                    className="px-2.5 py-1.5 border border-primary text-primary hover:bg-primary/5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" /> {isDownloadingForm ? "Downloading..." : "Download Form"}
                  </button>
                  <button
                    onClick={() => setIsInviteSupervisorOpen(true)}
                    className="px-2.5 py-1.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Send className="w-3 h-3" /> Invite Supervisor
                  </button>
                </>
              ) : doc.canDownload ? (
                <button
                  onClick={() => {
                    if (doc.id === "placement-letter") {
                      handleDownloadPlacementLetter();
                    } else if (doc.id === "logbook-export") {
                      handleDownloadLogbookPDF();
                    } else if (doc.id === "final-report") {
                      toast.success(`Downloaded simulated copy of ${finalReportName}`);
                    }
                  }}
                  className="px-2.5 py-1.5 border border-primary text-primary hover:bg-primary/5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              ) : null}
              {doc.canUpload && (
                <button
                  onClick={() => {
                    if (doc.id === "acceptance-form") {
                      if (!myApp?.id) {
                        toast.error("No application ID found to upload acceptance form.");
                        return;
                      }
                      setIsAcceptanceOpen(true);
                    } else if (doc.id === "final-report") {
                      setIsReportUploadOpen(true);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded text-xs font-medium flex items-center justify-center gap-1 transition-opacity"
                >
                  <Upload className="w-3 h-3" /> {doc.id === "acceptance-form" ? "Upload Signed Form" : "Upload"}
                </button>
              )}
              {!doc.canDownload && !doc.canUpload && (
                <button
                  disabled
                  className="px-2.5 py-1.5 bg-secondary text-muted-foreground rounded text-xs opacity-50 cursor-not-allowed flex items-center justify-center gap-1"
                >
                  Not Available
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Supervisor Invitation Status */}
      {supervisorInviteSent && uploadedSupervisorName && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-emerald-900 text-sm">Supervisor Invited</h3>
              <p className="text-emerald-700 text-xs mt-1">
                <span className="font-medium">{uploadedSupervisorName}</span> ({uploadedSupervisorEmail})
              </p>
              <p className="text-emerald-600 text-xs mt-2">
                Access link sent. Link expires in 30 days.
              </p>
            </div>
            <button
              onClick={() => {
                if (uploadedSupervisorEmail && uploadedSupervisorName) {
                  sendSupervisorInvite(uploadedSupervisorName, uploadedSupervisorEmail, uploadedSupervisorPhone, uploadedSupervisorTitle);
                }
              }}
              className="ml-auto px-3 py-1.5 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            >
              Resend Invite
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {myApp && (
        <CompanyAcceptanceModal
          isOpen={isAcceptanceOpen}
          onClose={() => setIsAcceptanceOpen(false)}
          onSuccess={async (supervisorDetails) => {
            fetchApplicationData();
            if (supervisorDetails?.name && supervisorDetails?.email) {
              await sendSupervisorInvite(
                supervisorDetails.name,
                supervisorDetails.email,
                supervisorDetails.phone,
                supervisorDetails.title
              );
            }
          }}
          applicationId={myApp.id}
          companyName={typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company")}
          studentName={myApp.student?.user?.name ?? myApp.studentName ?? user?.name ?? "Student"}
          studentId={myApp.student?.student_id ?? myApp.studentId ?? user?.studentId}
          department={myApp.student?.department?.name ?? myApp.student?.department ?? myApp.department ?? user?.department}
          level={myApp.student?.level ?? myApp.level}
          companyAddress={typeof myApp.company?.address === "string" ? myApp.company.address : undefined}
          proposedStartDate={myApp.proposed_start_date}
          proposedEndDate={myApp.proposed_end_date}
        />
      )}

      <DocumentUploadModal
        isOpen={isReportUploadOpen}
        onClose={() => setIsReportUploadOpen(false)}
        onSuccess={handleFinalReportSuccess}
        title="Upload Final Report"
        description="Select your comprehensive internship report to upload (PDF, DOCX, or DOC formats allowed. Max 10MB)."
      />

      {/* Invite Supervisor Modal */}
      <InviteSupervisorModal
        isOpen={isInviteSupervisorOpen}
        onClose={() => setIsInviteSupervisorOpen(false)}
        applicationId={myApp?.id}
        initialName={supervisorName}
        initialEmail={supervisorEmail}
        initialPhone={supervisorPhone}
        studentName={myApp?.student?.user?.name ?? myApp?.studentName ?? user?.name ?? "Student"}
        companyName={typeof myApp?.company?.name === "string" ? myApp.company.name : (typeof myApp?.companyName === "string" ? myApp.companyName : "Company")}
      />

    </div>
  );
}