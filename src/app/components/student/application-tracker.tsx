import { FileText, Sparkles, CheckCircle2, Clock, X } from "lucide-react";
import { StatusBadge } from "../status-badge";

interface ApplicationTrackerProps {
  myApp: any;
  terms?: any[];
  onViewWindows: () => void;
}

function getStatusHistory(app: {
  dateApplied: string;
  status: string;
  companyStatus: string;
  supervisorAssigned?: string;
}) {
  const history: { status: string; timestamp: string; description: string; actor: string }[] = [];
  history.push({
    status: "Submitted",
    timestamp: `${app.dateApplied}T09:00:00`,
    description: "Application submitted by student",
    actor: "Student",
  });
  if (app.companyStatus === "Approved") {
    history.push({
      status: "Company Verified",
      timestamp: `${app.dateApplied}T14:30:00`,
      description: "Company verified and approved in the system",
      actor: "DLO",
    });
  }
  if (["Approved", "Company Accepted", "Active", "Completed"].includes(app.status)) {
    history.push({
      status: "Approved",
      timestamp: `${app.dateApplied}T16:00:00`,
      description: "Application approved by DLO. Placement letter generated.",
      actor: "Mrs. Esi Mensah (DLO)",
    });
  }
  if (["Company Accepted", "Active", "Completed"].includes(app.status)) {
    history.push({
      status: "Company Accepted",
      timestamp: "2026-03-08T10:15:00",
      description: "Company signed acceptance form. Student confirmed placement.",
      actor: "Company / Student",
    });
  }
  if (app.supervisorAssigned) {
    history.push({
      status: "Supervisor Assigned",
      timestamp: "2026-03-09T11:20:00",
      description: `Academic supervisor ${app.supervisorAssigned} assigned by DLO.`,
      actor: "Mrs. Esi Mensah (DLO)",
    });
  }
  if (app.status === "Active" || app.status === "Completed") {
    history.push({
      status: "Active",
      timestamp: "2026-06-01T08:00:00",
      description: "Internship officially started.",
      actor: "System",
    });
  }
  if (app.status === "Completed") {
    history.push({
      status: "Completed",
      timestamp: "2026-07-31T17:00:00",
      description: "Internship completed. Final evaluation submitted.",
      actor: "System",
    });
  }
  return history;
}

export function ApplicationTracker({ myApp, terms, onViewWindows }: ApplicationTrackerProps) {
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
                since {myApp.dateApplied}
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

      {/* Pre-internship Journey Panel — only while internship hasn't started */}
      {!["Active", "Completed"].includes(myApp.status) && (
        <ApplicationJourney app={myApp} term={matchedTerm} />
      )}

      {/* Application Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3>Application Info</h3>
          {[
            ["Student Name", myApp.studentName],
            ["Student ID", myApp.studentId],
            ["Department", myApp.department],
            ["Level", myApp.level],
            ["Date Applied", myApp.dateApplied],
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
    </div>
  );
}
