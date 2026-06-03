import { StatusBadge } from "../status-badge";

interface ApplicationStatusProps {
  status: string;
  createdAt: string;
}

export function ApplicationStatus({ status, createdAt }: ApplicationStatusProps) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        (status === "active" || status === "Active")
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
          : (status === "completed" || status === "Completed")
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
          : (status === "rejected" || status === "Rejected")
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
        </div>
        {(status === "submitted" || status === "under_review" || status === "Pending") && (
          <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: "0.8rem" }}>
            Your application is awaiting departmental review by the DLO.
          </p>
        )}
      </div>
    </div>
  );
}
