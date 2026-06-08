import { useState } from "react";
import { X, Send, CheckCircle2 } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { toast } from "sonner";

interface InviteSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string | number;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  studentName?: string;
  companyName?: string;
}

export function InviteSupervisorModal({
  isOpen,
  onClose,
  applicationId,
  initialName = "",
  initialEmail = "",
  initialPhone = "",
  studentName = "Student",
  companyName = "Company",
}: InviteSupervisorModalProps) {
  const [supervisorName, setSupervisorName] = useState(initialName);
  const [supervisorEmail, setSupervisorEmail] = useState(initialEmail);
  const [supervisorPhone, setSupervisorPhone] = useState(initialPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendLink = async () => {
    if (!supervisorName.trim() || !supervisorEmail.trim()) {
      toast.error("Please provide supervisor name and email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.requestMagicLink(supervisorEmail, {
        role: "industry_supervisor",
        name: supervisorName,
        phone: supervisorPhone || undefined,
        application_id: applicationId,
        company_name: companyName,
        student_name: studentName,
      });

      if (res.success) {
        setIsSuccess(true);
        toast.success(`Magic link sent to ${supervisorEmail}`);
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setSupervisorName("");
          setSupervisorEmail("");
          setSupervisorPhone("");
        }, 2000);
      } else {
        toast.error(res.message ?? "Failed to send magic link.");
      }
    } catch (error) {
      console.error("Error sending magic link:", error);
      toast.error("An error occurred while sending the link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Invite Supervisor</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-semibold text-emerald-900 text-sm">Link Sent Successfully!</p>
            <p className="text-xs text-emerald-700">
              {supervisorName} will receive an email with access link. It expires in 30 days.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a secure access link to your supervisor so they can evaluate your internship performance.
            </p>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="e.g., John Doe"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={supervisorEmail}
                  onChange={(e) => setSupervisorEmail(e.target.value)}
                  placeholder="supervisor@company.com"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={supervisorPhone}
                  onChange={(e) => setSupervisorPhone(e.target.value)}
                  placeholder="+233 XX XXX XXXX"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Note:</span> The supervisor will receive a secure magic link via email and can access the system for 30 days.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLink}
                disabled={isSubmitting || !supervisorName.trim() || !supervisorEmail.trim()}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Sending..." : "Send Link"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
