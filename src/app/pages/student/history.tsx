import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/card";
import {
  Award, BadgeCheck, ChevronDown, ChevronUp, Download, BookMarked,
  Calendar, FileText, BarChart3, FolderOpen, AlertCircle, Star
} from "lucide-react";
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

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time?: string;
  status: "present" | "absent" | "late" | "half_day";
  date: string;
}

type TabType = "overview" | "logbooks" | "attendance" | "grades" | "documents";

export function StudentHistoryPage() {
  const { user } = useAppContext();
  const [internships, setInternships] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, TabType>>({});

  const [logbookMap, setLogbookMap] = useState<Record<string, LogbookEntry[]>>({});
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});
  const [gradeMap, setGradeMap] = useState<Record<string, any>>({});
  const [assessmentMap, setAssessmentMap] = useState<Record<string, any>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, Record<string, boolean>>>({});

  // Load internship data
  useEffect(() => {
    apiClient.getInternships().then((res) => {
      if (res.success) {
        const sorted = [...res.data].sort((a, b) =>
          (b.created_at ?? "") > (a.created_at ?? "") ? 1 : -1
        );
        setInternships(sorted);
        // Initialize loading states
        const initialLoading: Record<string, Record<string, boolean>> = {};
        sorted.forEach(internship => {
          initialLoading[String(internship.id)] = {
            logbooks: false,
            attendance: false,
            grades: false,
            evaluation: false,
            documents: false
          };
        });
        setLoadingMap(initialLoading);
      }
    });
  }, []);

  if (!user) return null;

  const companyName = (app: any) => app?.company?.name ?? app?.companyName ?? "—";
  const dateApplied = (app: any) => app?.created_at ?? app?.dateApplied ?? "—";
  const startDate = (app: any) => app?.start_date ?? "—";
  const endDate = (app: any) => app?.end_date ?? "—";
  const supervisor = (app: any) => app?.industry_supervisor?.user?.name ?? app?.industry_supervisor?.name ?? "—";

  const loadLogbookEntries = async (internshipId: string) => {
    if (logbookMap[internshipId]) return;

    setLoadingMap(prev => ({
      ...prev,
      [internshipId]: { ...prev[internshipId], logbooks: true }
    }));
    try {
      const res = await apiClient.getInternshipLogbooks(internshipId, { per_page: 100 });
      if (res.success) {
        const logbooks = Array.isArray(res.data) ? res.data : res.data?.logbooks ?? [];
        console.log(`Loaded ${logbooks.length} logbooks for internship ${internshipId}:`, logbooks);
        // Sort by date descending
        const sorted = [...logbooks].sort((a, b) =>
          new Date(b.entry_date || b.created_at).getTime() - new Date(a.entry_date || a.created_at).getTime()
        );
        setLogbookMap((prev) => ({ ...prev, [internshipId]: sorted }));
      } else {
        console.warn("Failed to load logbooks:", res.message);
        toast.error("Failed to load logbook entries: " + (res.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Logbook load error:", error);
      toast.error("Failed to load logbook entries");
    } finally {
      setLoadingMap(prev => ({
        ...prev,
        [internshipId]: { ...prev[internshipId], logbooks: false }
      }));
    }
  };

  const loadAttendance = async (internshipId: string) => {
    if (attendanceMap[internshipId]) return;

    setLoadingMap(prev => ({
      ...prev,
      [internshipId]: { ...prev[internshipId], attendance: true }
    }));
    try {
      const res = await apiClient.getInternshipAttendance(internshipId);
      if (res.success) {
        const records = Array.isArray(res.data) ? res.data : res.data?.attendance ?? [];
        setAttendanceMap((prev) => ({ ...prev, [internshipId]: records }));
      }
    } catch (error) {
      toast.error("Failed to load attendance records");
    } finally {
      setLoadingMap(prev => ({
        ...prev,
        [internshipId]: { ...prev[internshipId], attendance: false }
      }));
    }
  };

  const loadGrades = async (internshipId: string) => {
    if (gradeMap[internshipId]) return;

    setLoadingMap(prev => ({
      ...prev,
      [internshipId]: { ...prev[internshipId], grades: true }
    }));
    try {
      const res = await apiClient.getGrade(internshipId);
      if (res.success && res.data) {
        setGradeMap((prev) => ({ ...prev, [internshipId]: res.data }));
      }
    } catch (error) {
      console.warn("Failed to load grades");
    } finally {
      setLoadingMap(prev => ({
        ...prev,
        [internshipId]: { ...prev[internshipId], grades: false }
      }));
    }
  };

  const loadAssessment = async (internshipId: string) => {
    if (assessmentMap[internshipId]) return;

    setLoadingMap(prev => ({
      ...prev,
      [internshipId]: { ...prev[internshipId], evaluation: true }
    }));
    try {
      const res = await apiClient.getIndustrialAssessments({ internship_id: internshipId });
      if (res.success && res.data && res.data.length > 0) {
        setAssessmentMap((prev) => ({ ...prev, [internshipId]: res.data[0] }));
      }
    } catch (error) {
      console.warn("Failed to load assessment");
    } finally {
      setLoadingMap(prev => ({
        ...prev,
        [internshipId]: { ...prev[internshipId], evaluation: false }
      }));
    }
  };

  const toggleExpand = (internshipId: string) => {
    if (expandedId === internshipId) {
      setExpandedId(null);
    } else {
      setExpandedId(internshipId);
      setActiveTab(prev => ({ ...prev, [internshipId]: "overview" }));
    }
  };

  const switchTab = (internshipId: string, tab: TabType) => {
    setActiveTab(prev => ({ ...prev, [internshipId]: tab }));

    // Load data when tab is switched
    if (tab === "logbooks") loadLogbookEntries(internshipId);
    if (tab === "attendance") loadAttendance(internshipId);
    if (tab === "grades") loadGrades(internshipId);
    if (tab === "documents") loadAssessment(internshipId);
  };

  const handleExport = (internshipId: string) => {
    const entries = logbookMap[internshipId] || [];
    const internship = internships.find((i) => String(i.id) === internshipId);
    const company = internship?.company?.name || "Unknown Company";
    exportLogbookToPDF(company, entries);
  };

  const InternshipCard = ({ internship, isPrimary = false }: { internship: any, isPrimary?: boolean }) => {
    const id = String(internship.id);
    const currentTab = activeTab[id] || "overview";
    const isExpanded = expandedId === id;

    return (
      <Card key={internship.id} className={`p-4 rounded-lg ${isPrimary ? "border-primary/20 bg-primary/5" : "border border-border"}`}>
        <div className="flex items-start gap-2 mb-3">
          {isPrimary && <BadgeCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{companyName(internship)}</h3>
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

        {/* Expand Button */}
        <button
          onClick={() => toggleExpand(id)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
            isExpanded ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          <span className="text-sm font-medium">View Details</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 border-t pt-3 space-y-3">
            {/* Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto pb-2">
              {[
                { key: "overview" as TabType, label: "Overview", icon: Award },
                { key: "logbooks" as TabType, label: "Logbooks", icon: BookMarked },
                { key: "attendance" as TabType, label: "Attendance", icon: Calendar },
                { key: "grades" as TabType, label: "Grades", icon: BarChart3 },
                { key: "documents" as TabType, label: "Evaluation", icon: Star },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => switchTab(id, key)}
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1 rounded whitespace-nowrap transition-colors ${
                    currentTab === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-2">
              {/* Overview Tab */}
              {currentTab === "overview" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground font-semibold">Start Date</p>
                      <p className="text-foreground">{new Date(startDate(internship)).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-semibold">End Date</p>
                      <p className="text-foreground">{endDate(internship) !== "—" ? new Date(endDate(internship)).toLocaleDateString() : "Ongoing"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground font-semibold">Supervisor</p>
                      <p className="text-foreground">{supervisor(internship)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Logbooks Tab */}
              {currentTab === "logbooks" && (
                <div className="space-y-2">
                  {loadingMap[id]?.logbooks ? (
                    <p className="text-muted-foreground text-xs text-center py-3">Loading logbooks...</p>
                  ) : logbookMap[id] && logbookMap[id].length > 0 ? (
                    <div className="space-y-2">
                      <div className="max-h-[350px] overflow-y-auto space-y-2">
                        {logbookMap[id].map((entry) => (
                          <div key={entry.id} className="p-3 bg-card rounded border border-border/50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-xs font-medium">
                                {new Date(entry.entry_date || entry.created_at).toLocaleDateString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                entry.status === "approved"  ? "bg-emerald-100 text-emerald-700" :
                                entry.status === "rejected"  ? "bg-red-100 text-red-700" :
                                entry.status === "submitted" ? "bg-blue-100 text-blue-700" :
                                entry.status === "revision_requested" ? "bg-orange-100 text-orange-700" :
                                                                       "bg-amber-100 text-amber-700"
                              }`}>
                                {entry.status || "draft"}
                              </span>
                            </div>
                            <p className="text-xs text-foreground line-clamp-2">{entry.activities_description}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleExport(id)}
                        className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Export All Logbooks
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground text-xs mb-1">No logbook entries found</p>
                      <p className="text-[10px] text-muted-foreground">Try reloading or check another internship</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance Tab */}
              {currentTab === "attendance" && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {loadingMap[id]?.attendance ? (
                    <p className="text-muted-foreground text-xs text-center py-3">Loading...</p>
                  ) : attendanceMap[id] && attendanceMap[id].length > 0 ? (
                    <>
                      <div className="text-xs space-y-1">
                        {attendanceMap[id].map((record) => (
                          <div key={record.id} className="p-2 bg-card rounded border border-border/50 flex items-center justify-between">
                            <span className="font-medium">{new Date(record.date).toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              record.status === "present" ? "bg-emerald-100 text-emerald-700" :
                              record.status === "late" ? "bg-amber-100 text-amber-700" :
                              record.status === "half_day" ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs text-center py-3">No attendance records</p>
                  )}
                </div>
              )}

              {/* Grades Tab */}
              {currentTab === "grades" && (
                <div className="space-y-3">
                  {loadingMap[id]?.grades ? (
                    <p className="text-muted-foreground text-xs text-center py-3">Loading...</p>
                  ) : gradeMap[id] ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-card rounded border border-border">
                        <p className="text-muted-foreground text-xs font-semibold mb-1">Final Grade</p>
                        <p className="text-2xl font-bold text-primary">{gradeMap[id].final_grade || gradeMap[id].overall_score || "N/A"}</p>
                      </div>

                      {(gradeMap[id].logbook_grade || gradeMap[id].supervisor_grade || gradeMap[id].academic_grade) && (
                        <div className="grid grid-cols-2 gap-2">
                          {gradeMap[id].logbook_grade && (
                            <div className="p-2 bg-card rounded border border-border">
                              <p className="text-muted-foreground text-[10px] font-semibold">Logbook</p>
                              <p className="text-lg font-bold">{gradeMap[id].logbook_grade}</p>
                            </div>
                          )}
                          {gradeMap[id].supervisor_grade && (
                            <div className="p-2 bg-card rounded border border-border">
                              <p className="text-muted-foreground text-[10px] font-semibold">Supervisor</p>
                              <p className="text-lg font-bold">{gradeMap[id].supervisor_grade}</p>
                            </div>
                          )}
                          {gradeMap[id].academic_grade && (
                            <div className="p-2 bg-card rounded border border-border">
                              <p className="text-muted-foreground text-[10px] font-semibold">Academic</p>
                              <p className="text-lg font-bold">{gradeMap[id].academic_grade}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {gradeMap[id].comments && (
                        <div className="p-3 bg-card rounded border border-border">
                          <p className="text-muted-foreground text-xs font-semibold mb-2">Feedback</p>
                          <p className="text-sm text-foreground">{gradeMap[id].comments}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs text-center py-3">No grades available</p>
                  )}
                </div>
              )}

              {/* Evaluation Tab */}
              {currentTab === "documents" && (
                <div className="space-y-3">
                  {loadingMap[id]?.evaluation ? (
                    <p className="text-muted-foreground text-xs text-center py-3">Loading...</p>
                  ) : assessmentMap[id] ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-card rounded border border-border">
                        <p className="text-muted-foreground text-xs font-semibold mb-2">Overall Rating</p>
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xl font-bold">{assessmentMap[id].overall_rating || assessmentMap[id].overall_score || "N/A"}/5</span>
                        </div>
                      </div>

                      {assessmentMap[id].general_comments && (
                        <div className="p-3 bg-card rounded border border-border">
                          <p className="text-muted-foreground text-xs font-semibold mb-2">Supervisor Comments</p>
                          <p className="text-sm text-foreground">{assessmentMap[id].general_comments}</p>
                        </div>
                      )}

                      {(assessmentMap[id].tech_understanding || assessmentMap[id].prof_communication || assessmentMap[id].eth_integrity) && (
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-xs font-semibold">Assessment Scores</p>
                          <div className="grid grid-cols-1 gap-2">
                            {assessmentMap[id].tech_understanding && (
                              <div className="flex justify-between p-2 bg-card rounded border border-border text-xs">
                                <span>Technical Skills</span>
                                <span className="font-bold">{assessmentMap[id].tech_understanding}/5</span>
                              </div>
                            )}
                            {assessmentMap[id].prof_communication && (
                              <div className="flex justify-between p-2 bg-card rounded border border-border text-xs">
                                <span>Communication</span>
                                <span className="font-bold">{assessmentMap[id].prof_communication}/5</span>
                              </div>
                            )}
                            {assessmentMap[id].eth_integrity && (
                              <div className="flex justify-between p-2 bg-card rounded border border-border text-xs">
                                <span>Integrity</span>
                                <span className="font-bold">{assessmentMap[id].eth_integrity}/5</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs text-center py-3">No evaluation data</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const latest = internships.length > 0 ? internships[0] : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Internship History</h1>
        <p className="text-muted-foreground text-sm mt-1">View all your internships and related data</p>
      </div>

      {/* Current Internship */}
      {latest && <InternshipCard internship={latest} isPrimary={true} />}

      {/* Past Internships */}
      {internships.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Past Internships</h3>
          <div className="space-y-2">
            {internships.slice(1).map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
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
