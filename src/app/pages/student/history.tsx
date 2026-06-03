import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/card";
import { Award, BadgeCheck, ChevronDown, ChevronUp, Download, BookMarked } from "lucide-react";
import { StatusBadge } from "../../components/status-badge";
import { toast } from "sonner";

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

    // Create a printable HTML
    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) {
      toast.error("Could not open print window");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${company} - Logbook Entries</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1a1a2e; margin-bottom: 5px; }
            .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
            .entry { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
            .entry-date { font-weight: bold; color: #0B5ED7; }
            .entry-activities { margin-top: 10px; color: #333; }
            .entry-skills { margin-top: 8px; color: #666; font-size: 0.9em; }
            .entry-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-top: 8px; }
            .status-approved { background-color: #d4edda; color: #155724; }
            .status-submitted { background-color: #d1ecf1; color: #0c5460; }
            .status-draft { background-color: #e2e3e5; color: #383d41; }
            .status-revision { background-color: #fff3cd; color: #856404; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${company}</h1>
          <div class="meta">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Total Entries: ${entries.length}</p>
            <p>Approved: ${entries.filter((e) => e.status === "approved").length}</p>
          </div>
          ${
            entries.length > 0
              ? entries
                  .map(
                    (entry) => `
              <div class="entry">
                <div class="entry-date">${new Date(entry.entry_date).toLocaleDateString()}</div>
                <div class="entry-activities"><strong>Activities:</strong> ${entry.activities_description || "—"}</div>
                ${entry.skills_learned ? `<div class="entry-skills"><strong>Skills:</strong> ${entry.skills_learned}</div>` : ""}
                <div class="entry-status status-${entry.status}">${entry.status.replace(/_/g, " ").toUpperCase()}</div>
              </div>
            `
                  )
                  .join("")
              : "<p>No logbook entries found.</p>"
          }
        </body>
      </html>
    `;

    if (printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
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
