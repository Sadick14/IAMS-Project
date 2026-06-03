import { useState } from "react";
import { FileText } from "lucide-react";
import { CompanyAcceptanceModal } from "./company-acceptance-modal";
import { ApplicationStatus } from "./application-status";
import { ApplicationActions } from "./application-actions";
import { ApplicationHistory } from "./application-history";
import { openPlacementLetter } from "../../lib/generate-placement-letter";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";

interface ApplicationTrackerProps {
  myApp: any;
  terms?: any[];
  onViewWindows: () => void;
  onCancelApplication?: () => void;
  onAcceptanceSubmitted?: () => void;
}

function getStatusHistory(app: any) {
  const history: { status: string; timestamp: string; description: string; actor: string }[] = [];
  const createdAt = app.created_at ?? app.dateApplied ?? "";
  const supervisorName = app.academic_supervisor?.name ?? app.supervisorAssigned ?? "Academic Supervisor";
  const companyStatus = app.company?.approval_status ?? app.companyStatus;

  history.push({
    status: "Submitted",
    timestamp: createdAt ? `${createdAt.split("T")[0]}T09:00:00` : "—",
    description: "Application submitted by student",
    actor: "Student",
  });
  if (companyStatus === "Approved" || companyStatus === "approved") {
    history.push({
      status: "Company Verified",
      timestamp: createdAt ? `${createdAt.split("T")[0]}T14:30:00` : "—",
      description: "Company verified and approved in the system",
      actor: "DLO",
    });
  }
  // Match real backend status values (all lowercase)
  const s = (app.status ?? "").toLowerCase();
  if (["approved", "company_accepted", "active", "completed"].includes(s)) {
    history.push({
      status: "Approved",
      timestamp: app.reviewed_at ? app.reviewed_at.split("T")[0] + "T16:00:00" : (createdAt ? `${createdAt.split("T")[0]}T16:00:00` : "—"),
      description: "Application approved by DLO. Placement letter generated.",
      actor: "DLO",
    });
  }
  if (["company_accepted", "active", "completed"].includes(s)) {
    history.push({
      status: "Company Accepted",
      timestamp: app.accepted_at ? app.accepted_at.split("T")[0] : "—",
      description: `Company confirmed. Supervisor: ${app.industry_supervisor_name ?? "TBC"}`,
      actor: "Company / Student",
    });
  }
  if (supervisorName && supervisorName !== "Academic Supervisor") {
    history.push({
      status: "Supervisor Assigned",
      timestamp: "—",
      description: `Academic supervisor ${supervisorName} assigned.`,
      actor: "DLO",
    });
  }
  if (["active", "completed"].includes(s)) {
    history.push({
      status: "Active",
      timestamp: app.confirmed_start_date ?? "—",
      description: "Internship officially started.",
      actor: "System",
    });
  }
  if (s === "completed") {
    history.push({
      status: "Completed",
      timestamp: "—",
      description: "Internship completed. Final evaluation submitted.",
      actor: "System",
    });
  }
  return history;
}

export function ApplicationTracker({
  myApp,
  terms,
  onViewWindows,
  onCancelApplication,
  onAcceptanceSubmitted,
}: ApplicationTrackerProps) {
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);

  if (!myApp) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
        <h3>No Application Found</h3>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          You have not submitted an application yet. Browse open internship windows and apply.
        </p>
        <button
          type="button"
          onClick={onViewWindows}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          style={{ fontSize: "0.85rem" }}
        >
          View Open Windows
        </button>
      </div>
    );
  }

  const statusHistory = getStatusHistory(myApp);
  const dateApplied = myApp.created_at ? new Date(myApp.created_at).toLocaleDateString() : (myApp.dateApplied ?? "—");

  const handleDownloadLetter = () => {
    const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
    const companyAddress = typeof myApp.company?.address === "string" ? myApp.company.address : undefined;
    const supervisorName = typeof myApp.academic_supervisor?.user?.name === "string" ? myApp.academic_supervisor.user.name : (typeof myApp.supervisorAssigned === "string" ? myApp.supervisorAssigned : undefined);

    openPlacementLetter({
      studentName: myApp.student?.user?.name ?? myApp.studentName ?? "Student",
      studentId: myApp.student?.student_id ?? myApp.studentId ?? "—",
      department: myApp.student?.department ?? myApp.department ?? "—",
      level: myApp.student?.level ?? myApp.level ?? "—",
      companyName,
      companyAddress,
      supervisorName,
      startDate: myApp.proposed_start_date,
      endDate: myApp.proposed_end_date,
    });
  };

  const handleCancelApplication = async () => {
    if (!myApp?.id) return;
    try {
      const res = await apiClient.deleteApplication(String(myApp.id));
      if (res.success) {
        toast.success("Application cancelled. You can now apply with a different company.");
        onCancelApplication?.();
      } else {
        toast.error(res.message ?? "Failed to cancel application");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("An error occurred");
    }
  };

  const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
  const proposedStartDate = typeof myApp.proposed_start_date === "string" ? myApp.proposed_start_date : undefined;
  const proposedEndDate = typeof myApp.proposed_end_date === "string" ? myApp.proposed_end_date : undefined;

  return (
    <div className="space-y-5">
      <ApplicationStatus status={myApp.status} createdAt={dateApplied} />

      <ApplicationActions
        status={myApp.status}
        onDownloadLetter={handleDownloadLetter}
        onSubmitAcceptance={() => setAcceptanceModalOpen(true)}
        onRejectCompany={handleCancelApplication}
      />

      <ApplicationHistory history={statusHistory} />

      <CompanyAcceptanceModal
        isOpen={acceptanceModalOpen}
        onClose={() => setAcceptanceModalOpen(false)}
        onSuccess={() => {
          setAcceptanceModalOpen(false);
          onAcceptanceSubmitted?.();
        }}
        applicationId={myApp.id}
        companyName={companyName}
        proposedStartDate={proposedStartDate}
        proposedEndDate={proposedEndDate}
      />
    </div>
  );
}
