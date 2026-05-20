import { useAppContext } from "../../lib/context";
import { getLatestApplicationForStudent } from "../../lib/store";
import { StatusBadge } from "../../components/status-badge";
import { StatCard } from "../../components/stat-card";
import { getStudentLogbook } from "../../services/logbook-service";
import { BookMarked, FileText, Clock, CheckCircle2, Upload, Award, Send } from "lucide-react";
import { useNavigate } from "react-router";

export function StudentDashboard() {
  const { user, store } = useAppContext();
  const navigate = useNavigate();

  const myApp = getLatestApplicationForStudent(user?.studentId || "");
  const logEntries = getStudentLogbook(user?.studentId || "");
  const lastEntry = logEntries[0];

  return (
    <div className="space-y-6">
      <div>
        <h1>Welcome, {user?.name}</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          {user?.studentId} · {user?.department}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Application Status"
          value={myApp?.status || "None"}
          subtitle={myApp ? `Applied: ${myApp.dateApplied}` : "Not applied yet"}
          icon={<FileText className="w-4 h-4" />}
          highlight
        />
        <StatCard
          title="Company"
          value={myApp?.companyName || "N/A"}
          subtitle={myApp ? `Status: ${myApp.companyStatus}` : ""}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          title="Logbook Entries"
          value={logEntries.length}
          subtitle={lastEntry ? `Last: ${lastEntry.date}` : "No entries yet"}
          icon={<BookMarked className="w-4 h-4" />}
        />
        <StatCard
          title="Supervisor"
          value={myApp?.supervisorAssigned || "Not assigned"}
          subtitle={myApp?.supervisorAssigned ? "Academic supervisor" : "Pending"}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!myApp && (
          <button
            onClick={() => navigate("/student/applications")}
            className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 text-left hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] hover:border-primary/40 transition-all"
          >
            <Send className="w-8 h-8 text-primary mb-3" />
            <h3>Apply for Attachment</h3>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
              Start your industrial attachment application.
            </p>
          </button>
        )}
        <button
          onClick={() => navigate("/student/logbook")}
          className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] hover:border-primary/30 transition-all"
        >
          <BookMarked className="w-8 h-8 text-primary mb-3" />
          <h3>Daily Logbook</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            Record your daily activities, skills learned, and challenges faced.
          </p>
        </button>
        <button
          onClick={() => navigate("/student/documents")}
          className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] hover:border-primary/30 transition-all"
        >
          <Upload className="w-8 h-8 text-primary mb-3" />
          <h3>Documents</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            Download placement letters and upload required forms.
          </p>
        </button>
        <button
          onClick={() => navigate("/student/evaluation")}
          className="bg-card border border-border rounded-2xl p-6 text-left hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] hover:border-primary/30 transition-all"
        >
          <Award className="w-8 h-8 text-primary mb-3" />
          <h3>My Grade</h3>
          <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
            View your evaluation breakdown and final grade.
          </p>
        </button>
      </div>

      {/* Recent Logbook Entries */}
      {logEntries.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3>Recent Logbook Entries</h3>
            <button onClick={() => navigate("/student/logbook")} className="text-primary hover:underline" style={{ fontSize: "0.8rem" }}>
              View all
            </button>
          </div>
          <div className="divide-y divide-border">
            {logEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: "0.85rem" }}>{entry.date}</p>
                </div>
                <p style={{ fontSize: "0.8rem" }} className="text-muted-foreground line-clamp-2">
                  {entry.activities}
                </p>
                {entry.skills && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.skills.split(",").map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground" style={{ fontSize: "0.7rem" }}>
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Timeline */}
      {myApp && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="mb-4">Application Timeline</h3>
          <div className="space-y-4">
            {[
              { label: "Application Submitted", date: myApp.dateApplied, done: true },
              { label: "Company Approved", date: myApp.companyStatus === "Approved" ? "Approved" : "Pending", done: myApp.companyStatus === "Approved" },
              { label: "Application Approved", date: ["Approved", "Company Accepted", "Active", "Completed"].includes(myApp.status) ? "Approved" : "Pending", done: ["Approved", "Company Accepted", "Active", "Completed"].includes(myApp.status) },
              { label: "Company Accepted", date: ["Company Accepted", "Active", "Completed"].includes(myApp.status) ? "Done" : "Pending", done: ["Company Accepted", "Active", "Completed"].includes(myApp.status) },
              { label: "Supervisor Assigned", date: myApp.supervisorAssigned || "Pending", done: !!myApp.supervisorAssigned },
              { label: "Internship Active", date: myApp.status === "Active" || myApp.status === "Completed" ? "Active" : "Pending", done: myApp.status === "Active" || myApp.status === "Completed" },
              { label: "Completed", date: myApp.status === "Completed" ? "Done" : "Pending", done: myApp.status === "Completed" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span style={{ fontSize: "0.7rem" }}>{i + 1}</span>}
                </div>
                <div>
                  <p style={{ fontSize: "0.85rem" }} className={step.done ? "" : "text-muted-foreground"}>
                    {step.label}
                  </p>
                  <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}