import { Calendar, Info, ArrowRight, Clock, Shield, X } from "lucide-react";
import { useState } from "react";

interface Term {
  id: string;
  name: string;
  status: string;
  type: string;
  applicationStart: string;
  applicationEnd: string;
  internshipStart: string;
  internshipEnd: string;
  eligibleLevels: string[];
  departments: string[];
}

interface TermWindowsListProps {
  availableTerms: Term[];
  onSelectTerm: (termId: string) => void;
  onViewChange: (view: "windows" | "apply" | "tracker") => void;
  userLevel?: string;
  isBlocked?: boolean;
}

export function TermWindowsList({
  availableTerms,
  onSelectTerm,
  onViewChange,
  userLevel = "L300",
  isBlocked = false,
}: TermWindowsListProps) {
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0 dark:text-blue-400" />
        <div>
          <p className="text-blue-800 dark:text-blue-300" style={{ fontSize: "0.85rem" }}>
            Below are the internship terms currently open or upcoming. Click on a term to view eligibility and apply.
          </p>
        </div>
      </div>

      {availableTerms.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3>No Open Windows</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            There are no active or upcoming internship windows at this time. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableTerms.map((term) => {
            const today = new Date().toISOString().split("T")[0];
            const appDeadline = term.applicationEnd ?? ""; // This is the actual deadline
            const isOpen = appDeadline && today <= appDeadline;
            const daysLeft = isOpen && appDeadline
              ? Math.max(0, Math.ceil((new Date(appDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null;

            const termName = String(term.name ?? "Term");
            const termStatus = String(term.status ?? "Upcoming");
            const termType = String(term.type ?? "Unknown");

            const statusColorMap: Record<string, { border: string; bgLight: string; text: string; icon: string }> = {
              active: { border: "border-l-emerald-500", bgLight: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", icon: "✓" },
              upcoming: { border: "border-l-blue-500", bgLight: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", icon: "⏱" },
              completed: { border: "border-l-gray-500", bgLight: "bg-gray-50 dark:bg-gray-950/20", text: "text-gray-700 dark:text-gray-400", icon: "✔" },
              archived: { border: "border-l-gray-500", bgLight: "bg-gray-50 dark:bg-gray-950/20", text: "text-gray-700 dark:text-gray-400", icon: "📦" },
            };
            const statusLower = termStatus.toLowerCase();
            const statusStyle = statusColorMap[statusLower] || statusColorMap.upcoming;

            const levelNames = (term.eligibleLevels ?? []).map((l: any) =>
              typeof l === "string" ? l : (l.name ?? l.code ?? String(l))
            );
            const isEligible = levelNames.length === 0 || levelNames.includes(userLevel);

            return (
              <div
                key={term.id}
                onClick={() => !isBlocked && setSelectedDetail(term.id)}
                className={`bg-card border-l-4 ${statusStyle.border} border-t border-r border-b border-border rounded-lg overflow-hidden transition-all group ${
                  isBlocked ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{termName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {termType === "regular" ? "📚 Semestrial" : "🏖️ Vacation"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${statusStyle.text} bg-white dark:bg-background`}>
                      {statusStyle.icon} {termStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Deadline: {appDeadline}
                    </span>
                  </div>

                  {isOpen && daysLeft !== null && daysLeft <= 7 && (
                    <div className="mt-2 px-2 py-1.5 bg-red-100/60 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300 font-medium">
                      ⏰ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">
                        {isEligible ? "✓ Eligible" : "✗ Ineligible"}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (() => {
        const term = availableTerms.find(t => t.id === selectedDetail);
        if (!term) return null;

        const today = new Date().toISOString().split("T")[0];
        const appDeadline = term.applicationEnd ?? ""; // Single deadline date
        const isOpen = appDeadline && today <= appDeadline;

        const levelNames = (term.eligibleLevels ?? []).map((l: any) =>
          typeof l === "string" ? l : (l.name ?? l.code ?? String(l))
        );
        const depts = (term.departments ?? []).map((d: any) =>
          typeof d === "string" ? d : (d.name ?? String(d))
        );
        const isEligible = levelNames.length === 0 || levelNames.includes(userLevel);

        const statusColorMap: Record<string, { text: string; icon: string }> = {
          active: { text: "text-emerald-700 dark:text-emerald-400", icon: "✓" },
          upcoming: { text: "text-blue-700 dark:text-blue-400", icon: "⏱" },
          completed: { text: "text-gray-700 dark:text-gray-400", icon: "✔" },
          archived: { text: "text-gray-700 dark:text-gray-400", icon: "📦" },
        };
        const statusLower = (term.status ?? "upcoming").toLowerCase();
        const statusStyle = statusColorMap[statusLower] || statusColorMap.upcoming;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{term.name}</h2>
                  <p className="text-muted-foreground mt-1">
                    {term.type === "regular" ? "📚 Semestrial Internship" : "🏖️ Vacation Internship"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div className={`p-4 rounded-lg ${statusStyle.text} bg-white dark:bg-background/40 border border-current/20`}>
                  <p className="text-sm font-semibold">{statusStyle.icon} Status: {(term.status ?? "Upcoming").toUpperCase()}</p>
                </div>

                {/* Key Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Application Deadline</p>
                    <p className="text-sm font-medium text-foreground">{appDeadline}</p>
                    <p className="text-xs text-muted-foreground">Last day to apply</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Internship Period</p>
                    <p className="text-sm font-medium text-foreground">{term.internshipStart}</p>
                    <p className="text-xs text-muted-foreground">to {term.internshipEnd}</p>
                  </div>
                </div>

                {/* Eligibility */}
                <div className={`p-4 rounded-lg border ${isEligible ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
                  <p className={`font-semibold ${isEligible ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                    {isEligible ? "✓ You are eligible for this term" : "✗ Your level does not match the required levels"}
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Required Levels: {levelNames.length > 0 ? levelNames.join(", ") : "All Levels"}
                  </p>
                </div>

                {/* Eligible Departments */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Eligible Departments:</p>
                  <div className="flex flex-wrap gap-2">
                    {depts.length > 0 ? depts.map((d) => (
                      <span key={d} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-medium text-sm">
                        {d}
                      </span>
                    )) : <span className="text-muted-foreground">All Departments</span>}
                  </div>
                </div>

                {/* Apply Button */}
                <div className="border-t border-border pt-6">
                  <button
                    onClick={() => {
                      onSelectTerm(term.id);
                      onViewChange("apply");
                      setSelectedDetail(null);
                    }}
                    disabled={!isOpen || !isEligible || isBlocked}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isOpen && isEligible && !isBlocked
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    }`}
                  >
                    {isBlocked ? "Complete Your Pending Application First" : !isOpen ? "Application Window Not Yet Open" : !isEligible ? "Your Level Does Not Match" : "Apply Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
