import { useState } from "react";
import { Megaphone, Send, X, Users, Mail, Bell, CheckCircle2, ChevronDown, Bold, Italic, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../services/auth-service";

interface Props {
  viewRole: ExtendedRole;
  onClose: () => void;
  onSend: (data: {
    title: string;
    message: string;
    priority: "Normal" | "Urgent";
    sendEmail: boolean;
    sendInApp: boolean;
    targets: string[];
    filters: Record<string, string>;
  }) => void;
}

export function AnnouncementComposer({ viewRole, onClose, onSend }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"Normal" | "Urgent">("Normal");
  const [sendEmail, setSendEmail] = useState(false);
  const [sendInApp, setSendInApp] = useState(true);

  const insertFormat = (format: 'bold' | 'italic' | 'link') => {
    const textarea = document.getElementById("announcement-message") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const selectedText = text.substring(start, end);

    let newText = "";
    let newCursorPos = start;

    if (format === 'bold') {
      newText = text.substring(0, start) + `**${selectedText || 'bold text'}**` + text.substring(end);
      newCursorPos = selectedText ? end + 4 : start + 2;
    } else if (format === 'italic') {
      newText = text.substring(0, start) + `*${selectedText || 'italic text'}*` + text.substring(end);
      newCursorPos = selectedText ? end + 2 : start + 1;
    } else if (format === 'link') {
      newText = text.substring(0, start) + `[${selectedText || 'link text'}](url)` + text.substring(end);
      newCursorPos = selectedText ? end + 3 : start + 1;
    }

    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      if (!selectedText) {
        if (format === 'bold') textarea.setSelectionRange(start + 2, start + 11);
        if (format === 'italic') textarea.setSelectionRange(start + 1, start + 12);
        if (format === 'link') textarea.setSelectionRange(start + 1, start + 10);
      } else {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // CLO → institution-wide options (each maps to one backend role)
  // DLO → same groups but scoped to their department on the backend
  const baseTargetOptions = viewRole === "clo"
    ? [
        "Everyone",
        "Students",
        "DLOs",
        "HODs",
        "Academic Supervisors",
        "Industry Supervisors",
      ]
    : [
        "Students in my department",
        "Academic Supervisors in my department",
        "Industry Supervisors",
        "HOD of my department",
      ];
    
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Filters (Mainly for students)
  const [filters, setFilters] = useState({
    batch: "",
    term: "",
    company: "",
    region: "",
    placementStatus: ""
  });

  const toggleTarget = (t: string) => {
    setSelectedTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    if (selectedTargets.length === 0) {
      toast.error("Select at least one target audience.");
      return;
    }
    if (!sendEmail && !sendInApp) {
      toast.error("Select at least one delivery method (Email or In-App).");
      return;
    }

    onSend({
      title,
      message,
      priority,
      sendEmail,
      sendInApp,
      targets: selectedTargets,
      filters
    });
  };

  const showFilters = selectedTargets.includes("Students");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-6" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">Compose Announcement</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Title & Message */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Announcement Title *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="E.g., Submission Deadline Extended" 
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" 
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Message Body *</label>
                <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-lg p-0.5">
                  <button type="button" onClick={() => insertFormat('bold')} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Bold">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertFormat('italic')} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Italic">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => insertFormat('link')} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Link">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea 
                id="announcement-message"
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                placeholder="Write the full announcement details here... (Markdown supported)" 
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm min-h-[120px] resize-y" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(["Normal", "Urgent"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      priority === p
                        ? p === "Urgent" 
                          ? "bg-red-50 text-red-700 border-red-200" 
                          : "bg-primary/10 text-primary border-primary/20"
                        : "border-border hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Methods */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Delivery Method *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSendInApp(!sendInApp)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    sendInApp ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" /> In-App
                </button>
                <button
                  onClick={() => setSendEmail(!sendEmail)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    sendEmail ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" /> Target Audience *
            </label>
            <div className="flex gap-2 flex-wrap">
              {baseTargetOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleTarget(opt)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedTargets.includes(opt) 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-background border-border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  {selectedTargets.includes(opt) && <CheckCircle2 className="w-3 h-3" />}
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Filters (Show if Students selected) */}
          {showFilters && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Filters (Optional)</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={filters.batch} 
                  onChange={(e) => setFilters({...filters, batch: e.target.value})}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">All Batches</option>
                  <option value="2024">Class of 2024</option>
                  <option value="2025">Class of 2025</option>
                  <option value="2026">Class of 2026</option>
                </select>
                
                <select 
                  value={filters.term} 
                  onChange={(e) => setFilters({...filters, term: e.target.value})}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">All Terms</option>
                  <option value="Semestrial">Semestrial</option>
                  <option value="Vacation">Vacation</option>
                </select>

                <select 
                  value={filters.placementStatus} 
                  onChange={(e) => setFilters({...filters, placementStatus: e.target.value})}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">Any Placement Status</option>
                  <option value="Placed">Placed</option>
                  <option value="Unplaced">Unplaced</option>
                  <option value="Pending">Pending Approval</option>
                </select>
                
                <select 
                  value={filters.company} 
                  onChange={(e) => setFilters({...filters, company: e.target.value})}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">All Companies</option>
                  <option value="TechHub Ghana">TechHub Ghana</option>
                  <option value="DataFlow Solutions">DataFlow Solutions</option>
                  <option value="Green Energy Corp">Green Energy Corp</option>
                </select>
                
                <select 
                  value={filters.region} 
                  onChange={(e) => setFilters({...filters, region: e.target.value})}
                  className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="">All Regions</option>
                  <option value="Greater Accra">Greater Accra</option>
                  <option value="Volta">Volta</option>
                  <option value="Ashanti">Ashanti</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend} 
            className="flex items-center gap-2 px-5 py-2 bg-[#0B5ED7] text-white rounded-lg hover:opacity-90 text-sm font-medium transition-opacity shadow-sm"
          >
            <Send className="w-4 h-4" /> Send Announcement
          </button>
        </div>

      </div>
    </div>
  );
}
