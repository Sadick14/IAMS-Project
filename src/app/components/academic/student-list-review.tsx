import { GraduationCap, BookMarked, Calendar, Eye } from "lucide-react";
import { getStudentLogbook } from "../../services/logbook-service";

interface Student {
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  companyName: string;
  status: string;
  grade?: string;
  gradeStatus?: string;
}

interface StudentListReviewProps {
  assignedStudents: Student[];
  onReviewStudent: (studentId: string) => void;
}

export function StudentListReview({ assignedStudents, onReviewStudent }: StudentListReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1>Evaluate & Monitor Students</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Review logbooks, track attendance, record site visits, and submit final evaluations
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3>Select a Student to Review</h3>
          <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            {assignedStudents.length} student{assignedStudents.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="divide-y divide-border">
          {assignedStudents.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3>No Students Assigned</h3>
              <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                Students will appear here once assigned by the DLO.
              </p>
            </div>
          ) : (
            assignedStudents.map((s) => {
              const logs = getStudentLogbook(s.studentId);
              const pending = logs.filter((l) => l.approvalStatus === "Pending").length;
              const lastLog = logs.sort((a, b) => b.date.localeCompare(a.date))[0];
              const daysSince = lastLog
                ? Math.floor((Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              const isFlagged = daysSince >= 3;

              return (
                <div key={s.id} className="p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-semibold"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {s.studentName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")}
                    </div>
                    {isFlagged && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold" style={{ fontSize: "0.95rem" }}>
                        {s.studentName}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          s.status === "Active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {s.status}
                      </span>
                      {s.grade && (
                        <span className="px-2 py-0.5 rounded bg-secondary text-xs font-medium" style={{ fontSize: "0.7rem" }}>
                          Grade: {s.grade} ({s.gradeStatus})
                        </span>
                      )}
                      {isFlagged && (
                        <span
                          className="px-2 py-0.5 rounded bg-red-100 text-red-700 animate-pulse text-xs font-semibold"
                          style={{ fontSize: "0.65rem" }}
                        >
                          {daysSince}d inactive
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                      {s.studentId} · {s.department} · {s.companyName}
                    </p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <BookMarked className="w-3.5 h-3.5 text-primary" /> {logs.length} entries
                        {pending > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md font-semibold text-xs ml-1">
                            {pending} pending
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Last: {lastLog?.date || "None"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReviewStudent(s.id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 shrink-0 font-medium transition-opacity"
                    style={{ fontSize: "0.85rem" }}
                  >
                    <Eye className="w-4 h-4" /> Review
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
