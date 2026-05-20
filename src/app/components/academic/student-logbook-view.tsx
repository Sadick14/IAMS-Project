import { BookMarked, Calendar, CheckCircle2 } from "lucide-react";

interface LogbookEntry {
  id: string;
  date: string;
  activities: string;
  skills: string;
  challenges: string;
  approvalStatus: string;
  approvedBy?: string;
  approvedAt?: string;
  supervisorComment?: string;
  createdAt: string;
}

interface StudentLogbookViewProps {
  logbookEntries: LogbookEntry[];
}

export function StudentLogbookView({ logbookEntries }: StudentLogbookViewProps) {
  return (
    <div className="space-y-3">
      {logbookEntries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p style={{ fontSize: "0.85rem" }}>No logbook entries found for this student.</p>
        </div>
      ) : (
        [...logbookEntries]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((entry) => (
            <div key={entry.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span style={{ fontSize: "0.9rem" }} className="font-semibold">{entry.date}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    entry.approvalStatus === "Approved"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : entry.approvalStatus === "Pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  }`}
                  style={{ fontSize: "0.7rem" }}
                >
                  {entry.approvalStatus}
                </span>
              </div>

              <div>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Activities
                </p>
                <p style={{ fontSize: "0.85rem" }} className="text-foreground leading-relaxed">
                  {entry.activities}
                </p>
              </div>

              {entry.skills && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {entry.skills.split(",").map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 bg-secondary rounded-lg text-secondary-foreground text-xs font-medium border border-border"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {entry.challenges && entry.challenges !== "None" && (
                <div>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Challenges
                  </p>
                  <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground leading-relaxed">
                    {entry.challenges}
                  </p>
                </div>
              )}

              {entry.approvedBy && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 dark:bg-emerald-950/20 dark:border-emerald-800">
                  <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium" style={{ fontSize: "0.75rem" }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Approved by {entry.approvedBy}
                    {entry.approvedAt &&
                      ` on ${new Date(entry.approvedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}`}
                  </p>
                  {entry.supervisorComment && (
                    <p className="text-emerald-600 dark:text-emerald-500 italic mt-1" style={{ fontSize: "0.75rem" }}>
                      "{entry.supervisorComment}"
                    </p>
                  )}
                </div>
              )}

              <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                Submitted:{" "}
                {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
      )}
    </div>
  );
}
