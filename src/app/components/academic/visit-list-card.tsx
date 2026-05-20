import {
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
} from "lucide-react";

interface VisitListCardProps {
  visit: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCompleteClick: () => void;
  onRescheduleClick: () => void;
  onCancelClick: () => void;
}

export function VisitListCard({
  visit,
  isExpanded,
  onToggleExpand,
  onCompleteClick,
  onRescheduleClick,
  onCancelClick,
}: VisitListCardProps) {
  const statusColors: Record<string, string> = {
    Scheduled: "bg-blue-100 text-blue-700",
    Completed: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-gray-100 text-gray-500",
    Rescheduled: "bg-amber-100 text-amber-700",
  };

  const totalScore = visit.ratings
    ? Object.values(visit.ratings).reduce<number>((a, b) => a + (b as number), 0)
    : 0;

  return (
    <div
      className={`bg-card border rounded-xl transition-colors ${
        visit.status === "Scheduled" ? "border-blue-200" : "border-border"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        className="w-full text-left p-5 flex items-center gap-4 cursor-pointer"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            visit.status === "Completed"
              ? "bg-emerald-100 text-emerald-700"
              : visit.status === "Scheduled"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {visit.status === "Completed" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span style={{ fontSize: "0.9rem" }}>{visit.studentName}</span>
            <span
              className={`px-2 py-0.5 rounded ${statusColors[visit.status]}`}
              style={{ fontSize: "0.65rem" }}
            >
              {visit.status}
            </span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            {visit.companyName} · {visit.companyAddress}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="text-muted-foreground flex items-center gap-1"
              style={{ fontSize: "0.75rem" }}
            >
              <Calendar className="w-3 h-3" /> {visit.date}
            </span>
            <span
              className="text-muted-foreground flex items-center gap-1"
              style={{ fontSize: "0.75rem" }}
            >
              <Clock className="w-3 h-3" /> {visit.time}
            </span>
            {visit.ratings && (
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0B5ED7]/10 text-[#0B5ED7] rounded"
                style={{ fontSize: "0.7rem", fontWeight: 500 }}
              >
                Score: {totalScore}/30
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {visit.status === "Scheduled" && (
          <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onCompleteClick}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 font-medium transition-colors"
              style={{ fontSize: "0.8rem" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </button>
            <button
              onClick={onRescheduleClick}
              className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent font-medium transition-colors"
              style={{ fontSize: "0.8rem" }}
            >
              Reschedule
            </button>
            <button
              onClick={onCancelClick}
              className="px-3 py-1.5 border border-border rounded-lg hover:bg-accent font-medium transition-colors"
              style={{ fontSize: "0.8rem" }}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="shrink-0 ml-1 text-muted-foreground">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border space-y-3 pt-4 animate-in slide-in-from-top-2 duration-100">
          {visit.contactPerson && (
            <div className="flex items-center gap-4">
              <span
                className="text-muted-foreground flex items-center gap-1.5"
                style={{ fontSize: "0.8rem" }}
              >
                <User className="w-3.5 h-3.5" /> {visit.contactPerson}
              </span>
              {visit.contactPhone && (
                <span
                  className="text-muted-foreground flex items-center gap-1.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  <Phone className="w-3.5 h-3.5" /> {visit.contactPhone}
                </span>
              )}
            </div>
          )}

          {visit.notes && (
            <div>
              <p
                style={{ fontSize: "0.7rem" }}
                className="text-muted-foreground uppercase tracking-wider mb-1"
              >
                Notes
              </p>
              <p style={{ fontSize: "0.85rem" }}>{visit.notes}</p>
            </div>
          )}

          {visit.observations && (
            <div>
              <p
                style={{ fontSize: "0.7rem" }}
                className="text-muted-foreground uppercase tracking-wider mb-1"
              >
                Observations
              </p>
              <p style={{ fontSize: "0.85rem" }}>{visit.observations}</p>
            </div>
          )}

          {visit.companyFeedback && (
            <div>
              <p
                style={{ fontSize: "0.7rem" }}
                className="text-muted-foreground uppercase tracking-wider mb-1"
              >
                Company Feedback
              </p>
              <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground">
                {visit.companyFeedback}
              </p>
            </div>
          )}

          {visit.recommendations && (
            <div>
              <p
                style={{ fontSize: "0.7rem" }}
                className="text-muted-foreground uppercase tracking-wider mb-1"
              >
                Recommendations
              </p>
              <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground">
                {visit.recommendations}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
