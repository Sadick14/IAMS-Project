import { useState } from "react";
import { Megaphone, Send, X, Mail, Bell, CheckCircle2, Bold, Italic, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../services/auth-service";

interface Props {
  viewRole: ExtendedRole;
  onClose: () => void;
  onSend: (data: {
    title: string;
    message: string;
    priority: "low" | "normal" | "high" | "urgent";
    sendEmail: boolean;
    sendInApp: boolean;
    targets: string[];
    student_level?: number;
    term_type?: string;
    placement_status?: string;
  }) => void;
  isSending?: boolean;
}

// UI label → backend role name
const TARGET_ROLE_MAP: Record<string, string> = {
  "Everyone":                              "",
  "Students":                              "student",
  "Students in my department":             "student",
  "DLOs":                                  "dlo",
  "HODs":                                  "hod",
  "HOD of my department":                  "hod",
  "Academic Supervisors":                  "academic_supervisor",
  "Academic Supervisors in my department": "academic_supervisor",
  "Industry Supervisors":                  "industry_supervisor",
};

export function AnnouncementComposer({ viewRole, onClose, onSend, isSending = false }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Student filters
  const [studentLevel, setStudentLevel] = useState("");
  const [termType, setTermType] = useState("");
  const [placementStatus, setPlacementStatus] = useState("");

  const baseTargetOptions = viewRole === "clo"
    ? ["Everyone", "Students", "DLOs", "HODs", "Academic Supervisors", "Industry Supervisors"]
    : ["Students in my department", "Academic Supervisors in my department", "Industry Supervisors", "HOD of my department"];

  const showStudentFilters = selectedTargets.some((t) => t.toLowerCase().includes("student"));

  const toggleTarget = (t: string) =>
    setSelectedTargets((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const insertFormat = (format: "bold" | "italic" | "link") => {
    const ta = document.getElementById("ann-message") as HTMLTextAreaElement;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = message.substring(s, e);
    const wrap = format === "bold" ? `**${sel || "bold"}**`
      : format === "italic" ? `*${sel || "italic"}*`
      : `[${sel || "link text"}](url)`;
    setMessage(message.substring(0, s) + wrap + message.substring(e));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 2, s + wrap.length - 2); }, 0);
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) { toast.error("Title and message are required."); return; }
    if (selectedTargets.length === 0) { toast.error("Select at least one target audience."); return; }
    if (!sendEmail && !sendInApp) { toast.error("Select at least one delivery method."); return; }

    onSend({
      title,
      message,
      priority,
      sendEmail,
      sendInApp,
      targets: selectedTargets,
      student_level: studentLevel ? Number(studentLevel) : undefined,
      term_type: termType || undefined,
      placement_status: placementStatus || undefined,
    });
  };

  const priorityConfig = [
    { key: "normal" as const, label: "Normal", cls: "bg-primary/10 text-primary border-primary/20" },
    { key: "urgent" as const, label: "Urgent", cls: "bg-red-50 text-red-700 border-red-200" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[88vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">Compose Announcement</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Application Deadline Reminder"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
        </div>

        {/* Message with formatting */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Message *</label>
            <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg p-0.5">
              {(["bold", "italic", "link"] as const).map((f) => (
                <button key={f} type="button" onClick={() => insertFormat(f)}
                  className="p-1 rounded hover:bg-accent text-muted-foreground" title={f}>
                  {f === "bold" ? <Bold className="w-3.5 h-3.5" />
                    : f === "italic" ? <Italic className="w-3.5 h-3.5" />
                    : <LinkIcon className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
          <textarea id="ann-message" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Write announcement details… (Markdown supported)"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm min-h-[110px] resize-y" />
        </div>

        {/* Priority + Delivery */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Priority</label>
            <div className="flex gap-2">
              {priorityConfig.map((p) => (
                <button key={p.key} onClick={() => setPriority(p.key)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${priority === p.key ? p.cls : "border-border hover:bg-accent text-muted-foreground"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Delivery *</label>
            <div className="flex gap-2">
              <button onClick={() => setSendInApp(!sendInApp)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${sendInApp ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent text-muted-foreground"}`}>
                <Bell className="w-3.5 h-3.5" /> In-App
              </button>
              <button onClick={() => setSendEmail(!sendEmail)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${sendEmail ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent text-muted-foreground"}`}>
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
            </div>
          </div>
        </div>

        {/* Target Audience */}
        <div className="border-t border-border pt-4">
          <label className="block text-sm font-medium mb-2">Target Audience *</label>
          <div className="flex gap-2 flex-wrap">
            {baseTargetOptions.map((opt) => (
              <button key={opt} onClick={() => toggleTarget(opt)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  selectedTargets.includes(opt)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent text-muted-foreground"
                }`}>
                {selectedTargets.includes(opt) && <CheckCircle2 className="w-3 h-3" />}
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Student Filters — shown when any "Students" target is selected */}
        {showStudentFilters && (
          <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Student Filters <span className="font-normal normal-case">(optional — leave blank for all students)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Level */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Level (Batch)</label>
                <select value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm">
                  <option value="">All Levels</option>
                  <option value="100">L100 (1st Year)</option>
                  <option value="200">L200 (2nd Year)</option>
                  <option value="300">L300 (3rd Year)</option>
                  <option value="400">L400 (4th Year)</option>
                </select>
              </div>
              {/* Term type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Term Type</label>
                <select value={termType} onChange={(e) => setTermType(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm">
                  <option value="">All Terms</option>
                  <option value="regular">Semestrial</option>
                  <option value="short_term">Vacation</option>
                </select>
              </div>
              {/* Placement status */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Placement</label>
                <select value={placementStatus} onChange={(e) => setPlacementStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm">
                  <option value="">Any Status</option>
                  <option value="active">Active Internship</option>
                  <option value="pending">Application Pending</option>
                  <option value="none">Not Placed</option>
                </select>
              </div>
            </div>
            {(studentLevel || termType || placementStatus) && (
              <p className="text-xs text-primary mt-1">
                Will send to: {[
                  studentLevel ? `L${studentLevel}` : null,
                  termType ? (termType === "regular" ? "Semestrial term" : "Vacation term") : null,
                  placementStatus === "active" ? "active internship" : placementStatus === "pending" ? "pending application" : placementStatus === "none" ? "not placed" : null,
                ].filter(Boolean).join(", ")} students
                {viewRole === "dlo" ? " in your department" : ""}.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-sm font-medium">Cancel</button>
          <button onClick={handleSend} disabled={isSending}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium shadow-sm">
            {isSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Announcement</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export { TARGET_ROLE_MAP };
