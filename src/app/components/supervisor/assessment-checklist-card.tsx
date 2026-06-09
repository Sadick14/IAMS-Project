import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import type { SupervisorAssessmentSummary } from "../../types/api";

interface AssessmentChecklistCardProps {
  onNavigate?: (path: string) => void;
}

export function AssessmentChecklistCard({ onNavigate }: AssessmentChecklistCardProps) {
  const [summary, setSummary] = useState<SupervisorAssessmentSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSupervisorAssessmentSummary();
      if (res.success && res.data) {
        setSummary(res.data);
        return;
      }
    } catch (error) {
      console.error("Error loading assessment summary:", error);
    }

    try {
      const fallback = await apiClient.computeAssessmentSummary();
      if (fallback) {
        setSummary(fallback);
      }
    } catch (error) {
      console.error("Error computing assessment summary:", error);
      // If both calls fail, show empty state
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center h-48">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : (
          <p className="text-muted-foreground">Unable to load assessment summary</p>
        )}
      </div>
    );
  }

  const stats = [
    {
      label: "Logbooks",
      route: "/supervisor/logbooks",
      current: summary.logbooks.approved,
      total: summary.total_students,
      status: summary.logbooks.pending_review > 0 ? "pending" : "complete",
      color: "bg-amber-100 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-800",
      textColor: "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Assessments",
      route: "/supervisor/evaluate",
      current: summary.assessments.submitted,
      total: summary.assessments.total,
      status: summary.assessments.pending > 0 ? "pending" : "complete",
      color: "bg-blue-100 dark:bg-blue-950/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    {
      label: "Attendance",
      route: "/supervisor/attendance",
      current: summary.attendance.verified,
      total: summary.attendance.verified + summary.attendance.pending_verification,
      status:
        summary.attendance.pending_verification > 0 ? "pending" : "complete",
      color: "bg-emerald-100 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      textColor: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Messages",
      route: "/supervisor/communications",
      current: summary.comments.added,
      total: summary.comments.pending,
      status: summary.comments.pending > 0 ? "pending" : "complete",
      color: "bg-purple-100 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800",
      textColor: "text-purple-700 dark:text-purple-300",
    },
  ];

  const progressPercent = Math.min(
    summary.overall_progress,
    100
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Assessment Completion</h3>
          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {summary.total_students} student{summary.total_students !== 1 ? "s" : ""} assigned
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 p-6 bg-background">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`rounded-lg border ${stat.borderColor} ${stat.color} p-4 cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onNavigate?.(stat.route)}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {stat.label}
              </p>
              {stat.status === "complete" ? (
                <CheckCircle2 className={`w-4 h-4 ${stat.textColor}`} />
              ) : (
                <AlertCircle className={`w-4 h-4 ${stat.textColor}`} />
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.current}
              </span>
              <span className="text-xs text-muted-foreground">/ {stat.total}</span>
            </div>

            <div className="w-full bg-white/30 rounded-full h-1.5 mt-3">
              <div
                className={`${stat.color.split(" ")[0]} rounded-full h-1.5 transition-all`}
                style={{ width: `${stat.total > 0 ? (stat.current / stat.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-border space-y-2">
        <button
          onClick={() => onNavigate?.("/supervisor/logbooks")}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
        >
          Review Pending Logbooks
          {summary.logbooks.pending_review > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {summary.logbooks.pending_review}
            </span>
          )}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate?.("/supervisor/evaluate")}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
        >
          Submit Assessments
          {summary.assessments.pending > 0 && (
            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
              {summary.assessments.pending}
            </span>
          )}
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>

        <button
          onClick={() => onNavigate?.("/supervisor/communications")}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
        >
          View Messages
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  );
}
