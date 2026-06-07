import { useState } from "react";
import { Download, CheckSquare, AlertTriangle } from "lucide-react";

interface ApplicationActionsProps {
  status: string;
  onDownloadLetter: () => void;
  onDownloadAcceptanceForm: () => void;
  onSubmitAcceptance: () => void;
  onRejectCompany: () => void;
}

export function ApplicationActions({
  status,
  onDownloadLetter,
  onDownloadAcceptanceForm,
  onSubmitAcceptance,
  onRejectCompany,
}: ApplicationActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (status !== "approved") {
    return null;
  }

  if (showConfirm) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-5 space-y-3">
        <p className="text-red-700 dark:text-red-300 font-medium" style={{ fontSize: "0.9rem" }}>
          Are you sure you want to cancel this application?
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm">
          This will remove your current application. You can apply again with a different company for this internship window.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            Keep Application
          </button>
          <button
            onClick={() => {
              setShowConfirm(false);
              onRejectCompany();
            }}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            Yes, Cancel Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 space-y-3">
      <p className="text-blue-700 dark:text-blue-300 font-medium" style={{ fontSize: "0.9rem" }}>
        Your application has been approved! Next steps:
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onDownloadLetter}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" />
          Download Placement Letter
        </button>
        <button
          onClick={onDownloadAcceptanceForm}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" />
          Download Acceptance Form
        </button>
        <button
          onClick={onSubmitAcceptance}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <CheckSquare className="w-4 h-4" />
          Submit Company Acceptance
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 font-medium"
          style={{ fontSize: "0.85rem" }}
        >
          <AlertTriangle className="w-4 h-4" />
          Company Rejected
        </button>
      </div>
    </div>
  );
}
