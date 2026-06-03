import { FileText, Sparkles, CheckCircle2, Clock, X, Download, CheckSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "../status-badge";
import { openPlacementLetter } from "../../lib/generate-placement-letter";
import { CompanyAcceptanceModal } from "./company-acceptance-modal";
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
  const createdAt = app.created_at ?? app.dateApplied;
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
  if (["Approved", "Company Accepted", "Active", "Completed", "approved"].includes(app.status)) {
    history.push({
      status: "Approved",
      timestamp: createdAt ? `${createdAt.split("T")[0]}T16:00:00` : "—",
      description: "Application approved by DLO. Placement letter generated.",
      actor: "DLO",
    });
  }
  if (["Company Accepted", "Active", "Completed"].includes(app.status)) {
    history.push({
      status: "Company Accepted",
      timestamp: "—",
      description: "Company signed acceptance form. Student confirmed placement.",
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
  if (app.status === "Active" || app.status === "Completed") {
    history.push({
      status: "Active",
      timestamp: "—",
      description: "Internship officially started.",
      actor: "System",
    });
  }
  if (app.status === "Completed") {
    history.push({
      status: "Completed",
      timestamp: "—",
      description: "Internship completed. Final evaluation submitted.",
      actor: "System",
    });
  }
  return history;
}

export function ApplicationTracker({ myApp, terms, onViewWindows, onCancelApplication, onAcceptanceSubmitted }: ApplicationTrackerProps) {
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleDownloadPlacementLetter = () => {
    openPlacementLetter({
      studentName: myApp.student?.user?.name ?? myApp.studentName ?? "Student",
      studentId: myApp.student?.student_id ?? myApp.studentId ?? "—",
      department: myApp.student?.department ?? myApp.department ?? "—",
      level: myApp.student?.level ?? myApp.level ?? "—",
      companyName: myApp.company?.name ?? myApp.companyName ?? "Company",
      companyAddress: myApp.company?.address,
      supervisorName: myApp.academic_supervisor?.user?.name ?? myApp.supervisorAssigned,
      startDate: myApp.proposed_start_date,
      endDate: myApp.proposed_end_date,
    });
  };

  const handleCancelApplication = async () => {
    if (!myApp?.id) return;
    setIsCancelling(true);
    try {
      const res = await apiClient.deleteApplication(String(myApp.id));
      if (res.success) {
        toast.success("Application cancelled. You can now apply with a different company.");
        setShowCancelConfirm(false);
        onCancelApplication?.();
      } else {
        toast.error(res.message ?? "Failed to cancel application");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("An error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

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

  // Find corresponding term for application
  // Match term using backend field names (start_date, end_date, application_deadline)
  const matchedTerm = (terms ?? []).find((t: any) => {
    const appDate = myApp.created_at ?? myApp.dateApplied ?? "";
    return appDate >= (t.start_date ?? "") && appDate <= (t.end_date ?? "");
  });

  return (
    <div className="space-y-5">
      {/* Current Status Banner */}
      <div
        className={`rounded-xl p-5 border ${
          myApp.status === "Active"
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
            : myApp.status === "Completed"
            ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            : myApp.status === "Rejected"
            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
            : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-muted-foreground uppercase font-semibold" style={{ fontSize: "0.65rem" }}>
              CURRENT STATUS
            </p>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={myApp.status} />
              <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                since {myApp.created_at ? new Date(myApp.created_at).toLocaleDateString() : (myApp.dateApplied ?? "—")}
              </span>
            </div>
          </div>
          {myApp.status === "Pending" && (
            <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: "0.8rem" }}>
              Your application is awaiting departmental review by the DLO.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons for Approved Status */}
      {myApp.status === "approved" && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 space-y-3">
          <p className="text-blue-700 dark:text-blue-300 font-medium" style={{ fontSize: "0.9rem" }}>
            Your application has been approved! Next steps:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPlacementLetter}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              <Download className="w-4 h-4" />
              Download Placement Letter
            </button>
            <button
              onClick={() => setAcceptanceModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              <CheckSquare className="w-4 h-4" />
              Submit Company Acceptance
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              <AlertTriangle className="w-4 h-4" />
              Company Rejected
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 space-y-3">
          <p className="text-red-700 dark:text-red-300 font-medium" style={{ fontSize: "0.9rem" }}>
            Are you sure you want to cancel this application?
          </p>
          <p className="text-red-600 dark:text-red-400 text-sm">
            This will remove your current application. You can apply again with a different company for this internship window.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCancelConfirm(false)}
              disabled={isCancelling}
              className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              Keep Application
            </button>
            <button
              onClick={handleCancelApplication}
              disabled={isCancelling}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel Application"}
            </button>
          </div>
        </div>
      )}

      {/* Pre-internship Journey Panel — only while internship hasn't started */}
      {!["Active", "Completed"].includes(myApp.status) && (
        <ApplicationJourney
          app={{
            status: myApp.status,
            companyStatus: myApp.company?.approval_status ?? myApp.companyStatus ?? "",
            supervisorAssigned: myApp.academic_supervisor?.user?.name ?? myApp.supervisorAssigned ?? null,
            dateApplied: myApp.created_at ? new Date(myApp.created_at).toLocaleDateString() : (myApp.dateApplied ?? "—"),
            companyName: myApp.company?.name ?? myApp.companyName ?? "—",
            branchName: myApp.branch?.name ?? myApp.branchName,
          }}
          term={matchedTerm ? {
            name: matchedTerm.name,
            internshipStart: matchedTerm.internshipStart ?? matchedTerm.start_date ?? matchedTerm.internship_start ?? "—",
            internshipEnd: matchedTerm.internshipEnd ?? matchedTerm.end_date ?? matchedTerm.internship_end ?? "—",
          } : undefined}
        />
      )}

      {/* Application Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3>Application Info</h3>
          {[
            ["Student Name", myApp.student?.user?.name ?? myApp.studentName ?? "—"],
            ["Student ID", myApp.student?.student_id ?? myApp.studentId ?? "—"],
            ["Department", myApp.student?.department ?? myApp.department ?? "—"],
            ["Level", myApp.student?.level ?? myApp.level ?? "—"],
            ["Date Applied", myApp.created_at ? new Date(myApp.created_at).toLocaleDateString() : (myApp.dateApplied ?? "—")],
          ].map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold">
                {label}
              </p>
              <p style={{ fontSize: "0.85rem" }} className="font-medium">
                {val}
              </p>
            </div>
          ))}
          <div>
            <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
              Status
            </p>
            <StatusBadge status={myApp.status} />
          </div>
          {myApp.grade && (
            <div>
              <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Grade
              </p>
              <span className="px-3 py-1 bg-secondary rounded-lg font-semibold" style={{ fontSize: "0.9rem" }}>
                {myApp.grade}
              </span>
              {myApp.gradeStatus && (
                <span className="ml-2">
                  <StatusBadge status={myApp.gradeStatus} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status History Logs */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3>Timeline Log</h3>
          <div className="relative border-l-2 border-border pl-4 ml-2 space-y-4">
            {statusHistory.map((h, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-border border-2 border-card" />
                <div style={{ fontSize: "0.8rem" }}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{h.status}</p>
                    <span className="text-muted-foreground text-xs" style={{ fontSize: "0.7rem" }}>
                      {h.timestamp.replace("T", " ")}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.75rem" }}>
                    {h.description} · <span className="font-medium">{h.actor}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-internship Journey panel — shows the full pipeline from submission to start day.
function ApplicationJourney({
  app,
  term,
}: {
  app: {
    status: string;
    companyStatus: string;
    supervisorAssigned?: string;
    dateApplied: string;
    companyName: string;
    branchName?: string;
  };
  term?: { name: string; internshipStart: string; internshipEnd: string };
}) {
  const status = app.status;
  const companyApproved = app.companyStatus === "Approved";
  const isApproved = ["Approved", "Company Accepted", "Active", "Completed"].includes(status);
  const isCompanyAccepted = ["Company Accepted", "Active", "Completed"].includes(status);
  const hasSupervisor = !!app.supervisorAssigned;
  const isRejected = status === "Rejected";

  const stages: {
    title: string;
    description: string;
    state: "done" | "current" | "upcoming" | "blocked";
    actor: string;
  }[] = [
    {
      title: "Application Submitted",
      description: `Submitted on ${app.dateApplied} for ${app.companyName}${app.branchName ? ` — ${app.branchName}` : ""}.`,
      state: "done",
      actor: "You",
    },
    {
      title: "Company Verification",
      description: companyApproved
        ? "Your chosen company is verified in the system."
        : "DLO is verifying that the company exists and is suitable.",
      state: companyApproved ? "done" : status === "Pending" ? "current" : "upcoming",
      actor: "DLO",
    },
    {
      title: "Departmental Review",
      description: isRejected
        ? "Your application was rejected. Please contact your DLO."
        : isApproved
        ? "Your DLO approved the application and issued a placement letter."
        : "Your DLO is reviewing your application.",
      state: isRejected ? "blocked" : isApproved ? "done" : companyApproved && status === "Pending" ? "current" : "upcoming",
      actor: "DLO",
    },
    {
      title: "Company Acceptance",
      description: isCompanyAccepted
        ? "The company signed the acceptance form. Your placement is confirmed."
        : "Take the placement letter to your company. They sign and return the acceptance form.",
      state: isCompanyAccepted ? "done" : isApproved ? "current" : "upcoming",
      actor: "You + Company",
    },
    {
      title: "Academic Supervisor Assigned",
      description: hasSupervisor
        ? `${app.supervisorAssigned} will visit and evaluate you during the internship.`
        : "Your DLO will assign an academic supervisor before the internship starts.",
      state: hasSupervisor ? "done" : isCompanyAccepted ? "current" : "upcoming",
      actor: "DLO",
    },
    {
      title: "Internship Starts",
      description: term
        ? `Begin your attachment on ${term.internshipStart} at ${app.companyName}${app.branchName ? ` (${app.branchName})` : ""}.`
        : `Begin your attachment at ${app.companyName}${app.branchName ? ` (${app.branchName})` : ""}.`,
      state: status === "Active" || status === "Completed" ? "done" : hasSupervisor && isCompanyAccepted ? "current" : "upcoming",
      actor: "You",
    },
  ];

  const completed = stages.filter((s) => s.state === "done").length;
  const total = stages.length;
  const progressPct = Math.round((completed / total) * 100);
  const currentStage = stages.find((s) => s.state === "current");

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Your Application Journey
          </h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
            {term ? (
              <>
                Working towards <strong>{term.name}</strong> · starts {term.internshipStart}
              </>
            ) : (
              "Pipeline from submission to internship start"
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
            PROGRESS
          </p>
          <p style={{ fontSize: "1.1rem" }} className="text-primary font-bold">
            {progressPct}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="text-muted-foreground mb-5" style={{ fontSize: "0.75rem" }}>
        Step {completed + (currentStage ? 1 : 0)} of {total}
        {currentStage && (
          <>
            {" "}
            · Currently: <span className="text-foreground font-medium">{currentStage.title}</span>
          </>
        )}
      </p>

      {/* Vertical journey */}
      <div className="relative">
        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-border" />
        <div className="space-y-4">
          {stages.map((s, i) => {
            const iconBg =
              s.state === "done"
                ? "bg-emerald-500 text-white"
                : s.state === "current"
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : s.state === "blocked"
                ? "bg-red-500 text-white"
                : "bg-muted text-muted-foreground";
            const wrapTone =
              s.state === "current"
                ? "border-primary/30 bg-primary/5"
                : s.state === "blocked"
                ? "border-red-200 bg-red-50/50"
                : s.state === "done"
                ? "border-border bg-card"
                : "border-dashed border-border bg-secondary/10 opacity-70";

            return (
              <div key={i} className="flex items-start gap-4 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${iconBg}`}>
                  {s.state === "done" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : s.state === "blocked" ? (
                    <X className="w-4 h-4" />
                  ) : s.state === "current" ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span style={{ fontSize: "0.75rem" }} className="font-semibold">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className={`flex-1 rounded-xl border p-3.5 ${wrapTone}`}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p style={{ fontSize: "0.9rem" }} className="font-medium text-foreground">
                      {s.title}
                      {s.state === "current" && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold" style={{ fontSize: "0.6rem" }}>
                          IN PROGRESS
                        </span>
                      )}
                      {s.state === "blocked" && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold" style={{ fontSize: "0.6rem" }}>
                          BLOCKED
                        </span>
                      )}
                    </p>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.7rem" }}>
                      {s.actor}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1" style={{ fontSize: "0.8rem" }}>
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Company Acceptance Modal */}
      <CompanyAcceptanceModal
        isOpen={acceptanceModalOpen}
        onClose={() => setAcceptanceModalOpen(false)}
        onSuccess={() => {
          setAcceptanceModalOpen(false);
          onAcceptanceSubmitted?.();
        }}
        applicationId={myApp.id}
        companyName={myApp.company?.name ?? myApp.companyName ?? "Company"}
        proposedStartDate={myApp.proposed_start_date}
        proposedEndDate={myApp.proposed_end_date}
      />
    </div>
  );
}
