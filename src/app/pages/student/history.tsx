import { useMemo } from "react";
import { useAppContext } from "../../lib/context";
import { getLatestApplicationForStudent, getStudentApplicationHistory } from "../../lib/store";
import { Card } from "../../components/ui/card";
import { Award, FileText, Clock, BadgeCheck } from "lucide-react";

export function StudentHistoryPage() {
  const { user, store } = useAppContext();
  const history = useMemo(
    () => getStudentApplicationHistory(user?.studentId || ""),
    [store.applications, user?.studentId]
  );
  const latest = useMemo(() => getLatestApplicationForStudent(user?.studentId || ""), [store.applications, user?.studentId]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1>Internship History</h1>
        <p className="text-muted-foreground">Your internship periods are listed below, with the most recent period highlighted first.</p>
      </div>

      {latest && (
        <Card className="p-5 border-primary/20 bg-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BadgeCheck className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Current / Latest Period</h3>
              </div>
              <p className="text-sm"><strong>{latest.companyName}</strong> · {latest.department} · {latest.level}</p>
              <p className="text-sm text-muted-foreground mt-1">Status: {latest.status} · Applied: {latest.dateApplied}</p>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-background border text-xs font-medium">
              {latest.status}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.slice().reverse().map((app, index) => (
          <Card key={app.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{app.companyName}</h3>
                  {index === 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                      Most Recent
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{app.department} · {app.level}</p>
                <p className="text-sm mt-2">Status: <strong>{app.status}</strong></p>
                <p className="text-xs text-muted-foreground">Applied: {app.dateApplied}</p>
                {app.supervisorAssigned && (
                  <p className="text-xs text-muted-foreground mt-1">Supervisor: {app.supervisorAssigned}</p>
                )}
              </div>
              <div className="text-right">
                <button
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
                  type="button"
                >
                  View Details
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {history.length === 0 && (
        <Card className="p-8 text-center">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3>No internship periods yet</h3>
          <p className="text-muted-foreground">Start an application to see your internship history here.</p>
        </Card>
      )}
    </div>
  );
}
