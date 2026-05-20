import { useState } from "react";
import { Sliders, Sparkles, RefreshCw, Briefcase, GraduationCap, Clock, CheckCircle2 } from "lucide-react";
import { useAppContext } from "../lib/context";
import { simulateStudentStage, getLatestApplicationForStudent } from "../lib/store";

export function StudentLifecycleSimulator() {
  const { user, store } = useAppContext();
  const [isResetting, setIsResetting] = useState(false);

  // This simulator only concerns our primary student: John Doe (CS/2023/001)
  if (!user || user.email !== "john.doe@st.htu.edu.gh") return null;

  const currentApp = getLatestApplicationForStudent(user.studentId || "");
  const currentStatus = currentApp?.status || "Fresh";

  const handleStageTransition = (stage: "fresh" | "pending" | "active" | "completed") => {
    setIsResetting(true);
    setTimeout(() => {
      simulateStudentStage(stage, user.studentId || "CS/2023/001");
      setIsResetting(false);
    }, 400);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-4 md:p-5 transition-all duration-300"
      style={{
        boxShadow: "0 10px 30px -10px rgba(11, 94, 215, 0.15), 0 1px 3px rgba(11, 94, 215, 0.05)",
        background: "linear-gradient(135deg, var(--card) 0%, rgba(11, 94, 215, 0.03) 100%)",
      }}
    >
      {/* Decorative gradient blur */}
      <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Section: Information */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-foreground flex items-center gap-1.5" style={{ fontSize: "0.95rem" }}>
              Internship Stage Simulator
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                <Sparkles className="w-2.5 h-2.5" /> Demo Sandbox
              </span>
            </h3>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: "0.8rem", lineHeight: "1.3" }}>
            A single student undergoes three lifecycle phases. Switch between states dynamically to explore the <strong>Fresh Wizard</strong>, <strong>Active Logbook</strong>, and <strong>Final Grades Transcripts</strong> immediately!
          </p>
        </div>

        {/* Right Section: Active Stage Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>
            Simulated State:{" "}
          </span>
          <span className="text-primary font-semibold uppercase" style={{ fontSize: "0.75rem" }}>
            {currentStatus === "Company Accepted" ? "Approved" : currentStatus}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => handleStageTransition("fresh")}
          disabled={isResetting}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${currentStatus === "Fresh"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background/80 hover:bg-card border-border text-foreground hover:border-primary/30"
            }`}
          style={{ fontSize: "0.78rem" }}
        >
          {isResetting && currentStatus === "Fresh" ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          🌱 1. Fresh Slate
        </button>

        <button
          onClick={() => handleStageTransition("pending")}
          disabled={isResetting}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${currentStatus === "Pending"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background/80 hover:bg-card border-border text-foreground hover:border-primary/30"
            }`}
          style={{ fontSize: "0.78rem" }}
        >
          {isResetting && currentStatus === "Pending" ? (
            <Clock className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          ⏳ 2. Applied (Pending)
        </button>

        <button
          onClick={() => handleStageTransition("active")}
          disabled={isResetting}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${currentStatus === "Active"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background/80 hover:bg-card border-border text-foreground hover:border-primary/30"
            }`}
          style={{ fontSize: "0.78rem" }}
        >
          {isResetting && currentStatus === "Active" ? (
            <Briefcase className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Briefcase className="w-3.5 h-3.5" />
          )}
          💼 3. Active Internship
        </button>

        <button
          onClick={() => handleStageTransition("completed")}
          disabled={isResetting}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer ${currentStatus === "Completed"
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background/80 hover:bg-card border-border text-foreground hover:border-primary/30"
            }`}
          style={{ fontSize: "0.78rem" }}
        >
          {isResetting && currentStatus === "Completed" ? (
            <GraduationCap className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5" />
          )}
          🎓 4. Graded & Complete
        </button>
      </div>
    </div>
  );
}
