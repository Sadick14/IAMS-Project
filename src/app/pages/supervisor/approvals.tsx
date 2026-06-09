import { useState, useEffect } from "react";
import { apiClient } from "../../lib/api-client";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, Mail, RefreshCw, AlertCircle
} from "lucide-react";

export function SupervisorApprovalsPage() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.getPendingSupervisorInvitations();
      if (res.success) {
        setInvitations(res.data || []);
      } else {
        toast.error("Failed to load pending invitations.");
      }
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // Auto-refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (invitationId: string, studentName: string) => {
    const res = await apiClient.approveSupervisorInvitation(invitationId);
    if (res.success) {
      toast.success(`Approved invitation from ${studentName}.`);
      load();
    } else {
      toast.error("Failed to approve invitation.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1>Student Approvals</h1>
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Student Approvals</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Approve or reject students who have invited you to the platform.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-3 py-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50 flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {!refreshing && "Refresh"}
        </button>
      </div>

      {invitations.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Pending Invitations</h3>
          <p className="text-muted-foreground text-sm">
            All student invitations have been processed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 text-sm font-semibold">
                      {(invitation.student?.user?.name || invitation.student_name || "?")
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {invitation.student?.user?.name || invitation.student_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invitation.student?.student_id || invitation.student_id || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {invitation.student?.user?.email || invitation.email || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Invited {new Date(invitation.created_at || invitation.invited_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleApprove(invitation.id, invitation.student?.user?.name || invitation.student_name || "Student")}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shrink-0"
                  style={{ fontSize: "0.8rem" }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Approve</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">What happens when you approve?</h4>
            <p className="text-blue-700 dark:text-blue-300 text-xs">
              Once you approve a student, you will be able to see their internship details, logbooks, attendance records, and provide assessments. The student will be notified of your approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
