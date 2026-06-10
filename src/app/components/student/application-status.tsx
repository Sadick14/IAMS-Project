import { StatusBadge } from "../status-badge";
import { CheckCircle2, Clock, FileText, Building2, UserCheck, PlayCircle, Trophy } from "lucide-react";

interface ApplicationStatusProps {
  status: string;
  createdAt: string;
  internshipStartDate?: string;
}

export function ApplicationStatus({ status, createdAt, internshipStartDate }: ApplicationStatusProps) {
  const s = (status || "").toLowerCase();

  const steps = [
    { id: "submitted", label: "Submitted", icon: FileText, desc: "Application sent" },
    { id: "approved", label: "DLO Review", icon: UserCheck, desc: "Academic approval" },
    { id: "company_accepted", label: "Placement", icon: Building2, desc: "Company confirmed" },
    { id: "active", label: "In Progress", icon: PlayCircle, desc: "Internship active" },
    { id: "completed", label: "Finished", icon: Trophy, desc: "Term completed" },
  ];

  const getStepIndex = (statusStr: string) => {
    if (statusStr === "submitted" || statusStr === "under_review" || statusStr === "pending") return 0;
    if (statusStr === "approved") return 1;
    if (statusStr === "company_accepted") return 2;
    if (statusStr === "active") return 3;
    if (statusStr === "completed") return 4;
    if (statusStr === "rejected") return -1;
    return 0;
  };

  const currentStep = getStepIndex(s);

  return (
    <div className="space-y-4">
      <div
        className={`rounded-xl p-5 border ${
          s === "active"
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
            : s === "completed"
            ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
            : s === "rejected"
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
              <StatusBadge status={status} />
              <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                since {createdAt}
              </span>
            </div>
            {internshipStartDate && (
              <p className="text-muted-foreground mt-2" style={{ fontSize: "0.8rem" }}>
                Internship begins: <span className="font-medium text-foreground">{internshipStartDate}</span>
              </p>
            )}
          </div>
          {currentStep === 0 && s !== "rejected" && (
            <p className="text-amber-700 dark:text-amber-400 text-sm max-w-xs text-right" style={{ fontSize: "0.8rem" }}>
              Your application is awaiting departmental review by the DLO.
            </p>
          )}
          {s === "approved" && (
            <p className="text-emerald-700 dark:text-emerald-400 text-sm max-w-xs text-right" style={{ fontSize: "0.8rem" }}>
              Academic approval granted! Please download your letter and upload the company acceptance form.
            </p>
          )}
        </div>
      </div>

      {/* Visual Timeline */}
      {s !== "rejected" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-muted-foreground uppercase font-semibold mb-6" style={{ fontSize: "0.65rem" }}>
            APPLICATION JOURNEY
          </p>
          <div className="relative flex justify-between">
            {/* Background Line */}
            <div className="absolute top-5 left-0 w-full h-0.5 bg-muted z-0" />
            {/* Progress Line */}
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isFuture = idx > currentStep;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 w-1/5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isPast
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-card border-primary text-primary ring-4 ring-primary/10 scale-110"
                        : "bg-card border-muted text-muted-foreground"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <p className={`text-[0.7rem] font-bold ${isFuture ? "text-muted-foreground" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-[0.6rem] text-muted-foreground hidden sm:block">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
