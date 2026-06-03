// Display labels for backend's lowercase status values
const statusLabels: Record<string, string> = {
  approved: "Approved", active: "Active", submitted: "Submitted",
  under_review: "Under Review", rejected: "Rejected", completed: "Completed",
  archived: "Archived", upcoming: "Upcoming", draft: "Draft",
  company_accepted: "Accepted", pending: "Pending", calculated: "Calculated",
  published: "Published", scheduled: "Scheduled", cancelled: "Cancelled",
  terminated: "Terminated", inactive: "Inactive",
};

const statusColors: Record<string, string> = {
  // Lowercase (backend values)
  approved: "bg-emerald-100 text-emerald-700",
  active: "bg-blue-100 text-blue-700",
  submitted: "bg-indigo-100 text-indigo-700",
  under_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-violet-100 text-violet-700",
  archived: "bg-gray-200 text-gray-600",
  upcoming: "bg-cyan-100 text-cyan-700",
  company_accepted: "bg-teal-100 text-teal-700",
  draft: "bg-gray-100 text-gray-600",
  calculated: "bg-orange-100 text-orange-700",
  published: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  cancelled: "bg-red-100 text-red-700",
  terminated: "bg-red-200 text-red-800",
  pending: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-200 text-gray-600",
  // Capitalised legacy values (kept for backwards-compat)
  Approved: "bg-emerald-100 text-emerald-700",
  Active: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
  Completed: "bg-violet-100 text-violet-700",
  Archived: "bg-gray-200 text-gray-600",
  Upcoming: "bg-cyan-100 text-cyan-700",
  "Company Accepted": "bg-teal-100 text-teal-700",
  Submitted: "bg-indigo-100 text-indigo-700",
};

export function StatusBadge({ status }: { status: string | any }) {
  const raw = typeof status === "string" ? status : (status?.name ?? status?.status ?? String(status) ?? "Unknown");
  const label = statusLabels[raw] ?? raw;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${statusColors[raw] || "bg-gray-100 text-gray-700"}`}
      style={{ fontSize: "0.75rem" }}
    >
      {label}
    </span>
  );
}
