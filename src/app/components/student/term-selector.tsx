import type { TermResponse as Term } from "../../types/api";
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles } from "lucide-react";

interface TermSelectorProps {
  availableTerms: Term[];
  selectedTermId: string;
  eligibilityError: string | null;
  onSelectTerm: (termId: string) => void;
}

export function TermSelector({
  availableTerms,
  selectedTermId,
  eligibilityError,
  onSelectTerm,
}: TermSelectorProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3>Select Internship Window</h3>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
          Choose the term you want to apply for. The system will check your eligibility automatically.
        </p>
      </div>

      {availableTerms.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-amber-800" style={{ fontSize: "0.85rem" }}>
            No terms are currently accepting applications. Please check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableTerms.map((term) => {
            const today = new Date().toISOString().split("T")[0];

            // Real API uses application_deadline; fallback to applicationStart/Start
            const appStart = String(term.application_deadline ?? term.application_start ?? term.applicationStart ?? "");
            const appEnd = String(term.application_deadline ?? term.application_end ?? term.applicationEnd ?? "");

            // Real API uses start_date/end_date; fallback to internship variants
            const intStart = String(term.start_date ?? term.internshipStart ?? term.internship_start ?? "—");
            const intEnd = String(term.end_date ?? term.internshipEnd ?? term.internship_end ?? "—");

            // Normalize strings
            const termName = typeof term.name === "string" ? term.name : "Term";
            const termType = typeof term.type === "string" ? term.type : "Unknown";
            const levelNames = (term.eligibleLevels ?? []).map((l: any) =>
              typeof l === "string" ? l : (l.name ?? l.code ?? String(l))
            );
            const levelStr = levelNames.join(", ");

            const isOpen = appStart && appEnd && today >= appStart && today <= appEnd;
            const isSelected = selectedTermId === String(term.id);

            return (
              <button
                key={term.id}
                type="button"
                onClick={() => onSelectTerm(String(term.id))}
                disabled={!isOpen}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? eligibilityError
                      ? "border-red-400 bg-red-50/50"
                      : "border-primary bg-primary/5"
                    : !isOpen
                    ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p style={{ fontSize: "0.95rem" }} className="text-foreground font-medium">
                        {termName}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          isOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {isOpen ? "Open" : "Not Yet Open"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                        Type: <strong>{termType}</strong>
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                        Levels: {levelStr.length > 0 ? levelStr : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        Apply: {appStart || "—"} → {appEnd || "—"}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        Internship: {intStart} → {intEnd}
                      </span>
                    </div>
                  </div>
                  {isSelected && !eligibilityError && (
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Eligibility Error */}
      {eligibilityError && selectedTermId && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-medium" style={{ fontSize: "0.9rem" }}>
              Eligibility Check Failed
            </p>
            <p className="text-red-700 mt-1" style={{ fontSize: "0.85rem" }}>
              {eligibilityError}
            </p>
          </div>
        </div>
      )}

      {/* Eligibility Success */}
      {selectedTermId && !eligibilityError && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-emerald-800 font-medium" style={{ fontSize: "0.9rem" }}>
              You are eligible!
            </p>
            <p className="text-emerald-700 mt-1" style={{ fontSize: "0.85rem" }}>
              Your level and department match the requirements for this term. You can proceed to the next step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
