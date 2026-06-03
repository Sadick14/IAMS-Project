import { Calendar, Info, ArrowRight, Clock, Shield, Building2 } from "lucide-react";

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
}

export function TermWindowsList({
  availableTerms,
  onSelectTerm,
  onViewChange,
}: TermWindowsListProps) {
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
        <div className="space-y-3">
          {availableTerms.map((term) => {
            const today = new Date().toISOString().split("T")[0];
            const appStart = term.applicationStart ?? "";
            const appEnd = term.applicationEnd ?? "";
            const isOpen = appStart && appEnd && today >= appStart && today <= appEnd;
            const daysLeft = isOpen && appEnd
              ? Math.max(
                  0,
                  Math.ceil((new Date(appEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                )
              : null;

            const termName = String(term.name ?? "Term");
            const termStatus = String(term.status ?? "Upcoming");
            const termType = String(term.type ?? "Unknown");

            return (
              <div
                key={term.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3>{termName}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                            termStatus === "Active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                          }`}
                          style={{ fontSize: "0.7rem" }}
                        >
                          {termStatus}
                        </span>
                        {isOpen && daysLeft !== null && daysLeft <= 5 && (
                          <span
                            className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-700 animate-pulse text-xs font-semibold"
                            style={{ fontSize: "0.7rem" }}
                          >
                            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                          termType === "Semestrial"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {termType} Internship
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTerm(term.id);
                        onViewChange("apply");
                      }}
                      disabled={!isOpen}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-xs sm:text-sm ${
                        isOpen
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                      style={{ fontSize: "0.8rem" }}
                    >
                      {isOpen ? (
                        <>
                          Apply Now <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>Not Open Yet</>
                      )}
                    </button>
                  </div>

                  {/* Details Grid */}
                  {(() => {
                    const intStart = term.internshipStart ??"—";
                    const intEnd = term.internshipEnd ?? "—";
                    const levelNames = (term.eligibleLevels ?? []).map((l: any) =>
                      typeof l === "string" ? l : (l.name ?? l.code ?? String(l))
                    );
                    const depts = (term.departments ?? []).map((d: any) =>
                      typeof d === "string" ? d : (d.name ?? String(d))
                    );
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                              Application Window
                            </p>
                            <p style={{ fontSize: "0.8rem" }} className="font-medium">
                              {appStart || "—"}
                            </p>
                            <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground">
                              to {appEnd || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                              Internship Period
                            </p>
                            <p style={{ fontSize: "0.8rem" }} className="font-medium">
                              {intStart}
                            </p>
                            <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground">
                              to {intEnd}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                              Eligible Levels
                            </p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {levelNames.length > 0 ? levelNames.map((l) => (
                                <span key={String(l)} className="px-2 py-0.5 bg-secondary rounded font-medium" style={{ fontSize: "0.75rem" }}>
                                  {String(l)}
                                </span>
                              )) : <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <p className="text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                              Eligible Departments
                            </p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {depts.length > 0 ? depts.map((d) => (
                                <span key={d} className="px-2 py-0.5 bg-secondary rounded font-medium" style={{ fontSize: "0.75rem" }}>
                                  {d}
                                </span>
                              )) : <span className="text-muted-foreground text-xs">—</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
