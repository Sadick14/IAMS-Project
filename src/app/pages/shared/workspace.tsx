import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useNavigate } from "react-router";
import { Calendar, Users, GraduationCap, ChevronRight, RefreshCw, Layers } from "lucide-react";
import { SkeletonDashboard } from "../../components/skeleton";
import { toast } from "sonner";

export function WorkspacePage() {
  const { user, setSelectedTermId } = useAppContext();
  const navigate = useNavigate();

  const [terms, setTerms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const isDeptRole = user?.role === "dlo" || user?.role === "hod";
      const isSupervisorRole = user?.role === "supervisor" || user?.role === "academic";

      const [termsRes, appsRes, internshipsRes] = await Promise.all([
        apiClient.getTerms(),
        isDeptRole ? apiClient.getApplications({ department: user?.department }) : Promise.resolve({ success: false, data: [] }),
        isSupervisorRole ? apiClient.getDashboard(user?.role === "academic" ? "academic-supervisor" : "industry-supervisor") : Promise.resolve({ success: false, data: {} }),
      ]);

      if (termsRes.success) {
        setTerms(termsRes.data || []);
      }
      if (appsRes.success) {
        setApplications(appsRes.data || []);
      }
      if (internshipsRes.success) {
        setInternships(internshipsRes.data?.assigned_internships || []);
      }
    } catch (err) {
      console.error("Error loading workspace data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role]);

  const activeTerms = terms.filter(
    (t: any) => t.status?.toLowerCase() === "active"
  );

  const handleSelectWorkspace = (termId: string, termName: string) => {
    setSelectedTermId(String(termId));
    toast.success(`Switched workspace to ${termName}`);
    if (user?.role === "dlo") {
      navigate("/dlo");
    } else if (user?.role === "supervisor") {
      navigate("/supervisor");
    } else if (user?.role === "academic") {
      navigate("/academic");
    } else if (user?.role === "hod") {
      navigate("/hod");
    }
  };

  const getAssociatedCounts = (term: any) => {
    const termId = term.id;
    const isDeptRole = user?.role === "dlo" || user?.role === "hod";
    const isSupervisorRole = user?.role === "supervisor" || user?.role === "academic";

    if (isDeptRole) {
      const termApps = applications.filter(
        (app: any) =>
          String(app.academic_term_id ?? app.term_id ?? app.term?.id) === String(termId)
      );
      const activeCount = termApps.filter((app: any) => app.status === "active").length;
      return {
        applications: termApps.length,
        active: activeCount,
      };
    } else if (isSupervisorRole) {
      const termInternships = internships.filter(
        (intern: any) =>
          String(intern.academic_term_id ?? intern.term_id ?? intern.term?.id) === String(termId)
      );
      return {
        interns: termInternships.length,
      };
    }
    return null;
  };

  if (loading) return <SkeletonDashboard statCount={3} />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6">
      {/* Welcome Banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Workspace Selector
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Please select an academic term workspace below. Each workspace acts as an isolated dashboard tailored for that term's department placements, students, and works.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 flex items-center justify-center pointer-events-none">
          <Layers className="w-48 h-48 text-primary" />
        </div>
      </div>

      {/* Header and Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Active Academic Term Workspaces</h2>
          <p className="text-muted-foreground text-xs mt-1">Select a workspace card to view and manage current works</p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="px-3.5 py-2 border border-border rounded-xl hover:bg-muted disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Terms Listings */}
      {activeTerms.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card space-y-4">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <div>
            <h3 className="font-bold">No active terms found</h3>
            <p className="text-muted-foreground text-sm mt-1">There are currently no active academic terms configured in the system.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeTerms.map((term: any) => {
            const counts = getAssociatedCounts(term);
            const isDeptRole = user?.role === "dlo" || user?.role === "hod";
            return (
              <div
                key={term.id}
                onClick={() => handleSelectWorkspace(term.id, term.name)}
                className="group bg-card border border-border hover:border-primary hover:shadow-lg rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden"
              >
                {/* Accent decoration */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-primary/20 group-hover:bg-primary transition-all" />

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {term.name}
                      </h3>
                      <p className="text-muted-foreground text-xs mt-1">
                        Type: <span className="capitalize font-medium">{term.type === "short_term" ? "Vacation" : "Semestral"}</span>
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full capitalize">
                      {term.status}
                    </span>
                  </div>

                  {term.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                      {term.description}
                    </p>
                  )}

                  {/* Association Metrics */}
                  {counts && (
                    <div className="grid grid-cols-2 gap-4 bg-muted/40 rounded-xl p-4 border border-border/30">
                      {isDeptRole ? (
                        <>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Department Apps</p>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm font-bold">{counts.applications}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Active Placements</p>
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-sm font-bold">{counts.active}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 space-y-1">
                          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Assigned Interns</p>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-bold">{counts.interns} student(s)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-muted-foreground text-xs space-y-1 pt-1">
                    <p className="flex justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium text-foreground">{term.start_date ? new Date(term.start_date).toLocaleDateString("en-GB") : "—"}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>End Date:</span>
                      <span className="font-medium text-foreground">{term.end_date ? new Date(term.end_date).toLocaleDateString("en-GB") : "—"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-primary font-bold text-xs pt-4 border-t border-border/50">
                  <span>Enter Workspace</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
