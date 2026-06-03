import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/card";
import { Award, BadgeCheck, ChevronDown, ChevronUp, Download, BookMarked } from "lucide-react";
import { StatusBadge } from "../../components/status-badge";
import { toast } from "sonner";
import { exportLogbookToPDF } from "../../lib/logbook-export";

interface LogbookEntry {
  id: string;
  internship_id: number;
  entry_date: string;
  activities_description: string;
  skills_learned?: string;
  challenges_faced?: string;
  status: "draft" | "submitted" | "approved" | "revision_requested";
  created_at: string;
}

export function StudentHistoryPage() {
  const { user } = useAppContext();
  const [internships, setInternships] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logbookMap, setLogbookMap] = useState<Record<string, LogbookEntry[]>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Load internship data
  useEffect(() => {
    apiClient.getInternships().then((res) => {
      if (res.success) {
        const sorted = [...res.data].sort((a, b) =>
          (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1
        );
        setInternships(sorted);
      }
    });
  }, []);

  if (!user) return null;

  const latest = internships.length > 0 ? internships[0] : null;

  const companyName = (app: any) => app?.company?.name ?? app?.companyName ?? "—";
  const dateApplied = (app: any) => app?.created_at ?? app?.dateApplied ?? "—";
  const supervisor = (app: any) => app?.academic_supervisor?.user?.name ?? app?.academic_supervisor?.name ?? app?.supervisorAssigned ?? null;

  const loadLogbookEntries = async (internshipId: string) => {
    if (logbookMap[internshipId]) return;

    setLoadingMap((prev) => ({ ...prev, [internshipId]: true }));
    try {
      const res = await apiClient.getInternshipLogbooks(internshipId, { per_page: 100 });
      if (res.success) {
        setLogbookMap((prev) => ({ ...prev, [internshipId]: res.data ?? [] }));
      }
    } catch (error) {
      toast.error("Failed to load logbook entries");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [internshipId]: false }));
    }
  };

  const toggleExpand = (internshipId: string) => {
    if (expandedId === internshipId) {
      setExpandedId(null);
    } else {
      setExpandedId(internshipId);
      loadLogbookEntries(internshipId);
    }
  };

  const handleExport = (internshipId: string) => {
    const entries = logbookMap[internshipId] || [];
    const internship = internships.find((i) => String(i.id) === internshipId);
    const company = internship?.company?.name || "Unknown Company";
    exportLogbookToPDF(company, entries);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Internship History</h1>
        <p className="text-muted-foreground text-sm mt-1">Your internship records</p>
      </div>

      {latest && (
        <Card className="p-4 border-primary/20 bg-primary/5 rounded-lg">
          <div className="flex items-start gap-2 mb-3">
            <BadgeCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Current Period</h3>
              <p className="text-xs text-muted-foreground mt-1">{companyName(latest)}</p>
              <div className="flex flex-wrap gap-1 mt-2 items-center">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  latest.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : latest.status === "active"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {latest.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  Applied: {new Date(dateApplied(latest)).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Latest Internship Logbook Entries */}
          <div className="border-t border-primary/10 pt-3 mt-3">
            <button
              onClick={() => toggleExpand(String(latest.id))}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                <BookMarked className="w-4 h-4" />
                Logbook
              </div>
              {expandedId === String(latest.id) ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedId === String(latest.id) && (
              <div className="mt-2 space-y-1 max-h-[250px] overflow-y-auto border rounded-lg p-2 bg-white/30">
                {loadingMap[String(latest.id)] ? (
                  <p className="text-muted-foreground text-xs text-center py-3">Loading...</p>
                ) : logbookMap[String(latest.id)] && logbookMap[String(latest.id)].length > 0 ? (
                  <>
                    {logbookMap[String(latest.id)].map((entry) => (
                      <div key={entry.id} className="p-2 bg-card rounded border border-border/50">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {new Date(entry.entry_date).toLocaleDateString()}
                          </span>
                          <StatusBadge status={entry.status} />
                        </div>
                        <p className="text-xs text-foreground line-clamp-1">{entry.activities_description}</p>
                      </div>
                    ))}
                    <button
                      onClick={() => handleExport(String(latest.id))}
                      className="w-full mt-2 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-xs text-center py-3">No entries</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Past Internships */}
      {internships.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Past Internships</h3>
          <div className="space-y-2">
            {internships.slice(1).map((internship) => (
              <Card key={internship.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold">{companyName(internship)}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        internship.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : internship.status === "active"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {internship.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied: {new Date(dateApplied(internship)).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Expand Logbook */}
                <button
                  onClick={() => toggleExpand(String(internship.id))}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-accent transition-colors text-xs font-medium text-primary"
                >
                  <div className="flex items-center gap-1.5">
                    <BookMarked className="w-3.5 h-3.5" />
                    Logbook
                  </div>
                  {expandedId === String(internship.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {expandedId === String(internship.id) && (
                  <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto border rounded-lg p-2 bg-secondary/20">
                    {loadingMap[String(internship.id)] ? (
                      <p className="text-muted-foreground text-xs text-center py-2">Loading...</p>
                    ) : logbookMap[String(internship.id)] && logbookMap[String(internship.id)].length > 0 ? (
                      <>
                        {logbookMap[String(internship.id)].map((entry) => (
                          <div key={entry.id} className="p-2 bg-card rounded border border-border/50">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium">
                                {new Date(entry.entry_date).toLocaleDateString()}
                              </span>
                              <StatusBadge status={entry.status} />
                            </div>
                            <p className="text-xs text-foreground line-clamp-1 mt-1">{entry.activities_description}</p>
                          </div>
                        ))}
                        <button
                          onClick={() => handleExport(String(internship.id))}
                          className="w-full mt-2 px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs text-center py-2">No entries</p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {internships.length === 0 && (
        <Card className="p-6 text-center rounded-lg border border-border">
          <Award className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No internship records yet</p>
        </Card>
      )}
    </div>
  );
}
