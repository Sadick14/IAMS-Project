import { useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { VISITATION_CRITERIA, VisitationCriterionKey, VisitationCriterionRating } from "../../types/grading";

interface CompleteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (completeData: {
    observations: string;
    ratings: Record<VisitationCriterionKey, VisitationCriterionRating>;
  }) => void;
  isLoading?: boolean;
}

export function CompleteVisitModal({
  isOpen,
  onClose,
  onComplete,
  isLoading = false,
}: CompleteVisitModalProps) {
  const [completeForm, setCompleteForm] = useState<{
    observations: string;
    ratings: Record<VisitationCriterionKey, VisitationCriterionRating>;
  }>({
    observations: "",
    ratings: VISITATION_CRITERIA.reduce(
      (acc, c) => ({ ...acc, [c.key]: 0 }),
      {} as Record<VisitationCriterionKey, VisitationCriterionRating>
    ),
  });

  if (!isOpen) return null;

  const totalScore = Object.values(completeForm.ratings).reduce<number>(
    (a, b) => a + b,
    0
  );

  const handleSubmit = () => {
    if (!completeForm.observations.trim()) return;
    onComplete(completeForm);
    setCompleteForm({
      observations: "",
      ratings: VISITATION_CRITERIA.reduce(
        (acc, c) => ({ ...acc, [c.key]: 0 }),
        {} as Record<VisitationCriterionKey, VisitationCriterionRating>
      ),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3>Record Visit Observations & Score</h3>
            <p className="text-muted-foreground text-xs mt-1">
              Submit the 10-criterion rubric to lock the visitation score.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-center justify-between mb-3">
            <label className="font-semibold block" style={{ fontSize: "0.85rem" }}>
              Evaluation Rubric (0-3 points per criterion)
            </label>
            <div className="bg-[#0B5ED7]/10 text-[#0B5ED7] px-3 py-1 rounded-md font-semibold text-sm">
              Total: {totalScore} / 30
            </div>
          </div>
          <div className="space-y-3">
            {VISITATION_CRITERIA.map((criterion) => (
              <div
                key={criterion.key}
                className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 bg-muted/20 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <span className="font-medium text-[#0B5ED7] text-xs mr-2">{criterion.key}</span>
                  <span style={{ fontSize: "0.85rem" }}>{criterion.label}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {[0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setCompleteForm((prev) => ({
                          ...prev,
                          ratings: { ...prev.ratings, [criterion.key]: val as any },
                        }))
                      }
                      className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
                        completeForm.ratings[criterion.key] === val
                          ? "bg-[#0B5ED7] text-white border-[#0B5ED7]"
                          : "bg-card border-border hover:bg-accent text-muted-foreground"
                      }`}
                      style={{ fontSize: "0.85rem" }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: "0.8rem" }} className="font-semibold mb-1 block">
              General Observations & Comments *
            </label>
            <textarea
              value={completeForm.observations}
              onChange={(e) =>
                setCompleteForm((prev) => ({ ...prev, observations: e.target.value }))
              }
              placeholder="What did you observe during the visit?"
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
            style={{ fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!completeForm.observations.trim() || isLoading}
            className="px-4 py-2 bg-[#0B5ED7] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity font-medium"
            style={{ fontSize: "0.85rem" }}
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle2 className="w-4 h-4" /> Lock & Submit Score</>}
          </button>
        </div>
      </div>
    </div>
  );
}
