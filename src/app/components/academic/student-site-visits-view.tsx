import { useState } from "react";
import { Calendar, Building2, MapPin, Star, Save, X } from "lucide-react";

interface SiteVisitNote {
  id: string;
  date: string;
  observations: string;
  studentEngagement: number;
  companyFeedback: string;
  recommendations: string;
}

interface StudentSiteVisitsViewProps {
  siteVisitNotes: SiteVisitNote[];
  onAddVisitNote: (note: {
    date: string;
    observations: string;
    studentEngagement: number;
    companyFeedback: string;
    recommendations: string;
  }) => void;
}

export function StudentSiteVisitsView({
  siteVisitNotes,
  onAddVisitNote,
}: StudentSiteVisitsViewProps) {
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [newVisit, setNewVisit] = useState({
    date: new Date().toISOString().split("T")[0],
    observations: "",
    studentEngagement: 3,
    companyFeedback: "",
    recommendations: "",
  });

  const handleSave = () => {
    if (!newVisit.date || !newVisit.observations) return;
    onAddVisitNote(newVisit);
    setShowVisitForm(false);
    setNewVisit({
      date: new Date().toISOString().split("T")[0],
      observations: "",
      studentEngagement: 3,
      companyFeedback: "",
      recommendations: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Record observations from site visits to the student's company.
        </p>
        <button
          type="button"
          onClick={() => setShowVisitForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium transition-opacity"
          style={{ fontSize: "0.85rem" }}
        >
          <MapPin className="w-4 h-4" /> Add Visit Note
        </button>
      </div>

      {/* New Visit Form - Modal */}
      {showVisitForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVisitForm(false)}
        >
          <div
            className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3>New Site Visit Note</h3>
                <button
                  type="button"
                  onClick={() => setShowVisitForm(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Visit Date *</label>
                  <input
                    type="date"
                    value={newVisit.date}
                    onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Student Engagement (1-5)</label>
                  <div className="flex gap-1.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewVisit({ ...newVisit, studentEngagement: n })}
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                          newVisit.studentEngagement >= n
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "border-border hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            newVisit.studentEngagement >= n ? "fill-current text-yellow-400" : ""
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Observations *</label>
                  <textarea
                    value={newVisit.observations}
                    onChange={(e) => setNewVisit({ ...newVisit, observations: e.target.value })}
                    placeholder="Describe your observations during the visit..."
                    rows={3}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background min-h-[80px]"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Company Feedback</label>
                  <textarea
                    value={newVisit.companyFeedback}
                    onChange={(e) => setNewVisit({ ...newVisit, companyFeedback: e.target.value })}
                    placeholder="What did the company say about the student?"
                    rows={2}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem" }}>Recommendations</label>
                  <textarea
                    value={newVisit.recommendations}
                    onChange={(e) => setNewVisit({ ...newVisit, recommendations: e.target.value })}
                    placeholder="Any recommendations for the student or company?"
                    rows={2}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowVisitForm(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent font-medium text-xs sm:text-sm"
                  style={{ fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!newVisit.date || !newVisit.observations}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-semibold text-xs sm:text-sm transition-opacity"
                  style={{ fontSize: "0.85rem" }}
                >
                  <Save className="w-4 h-4" /> Save Visit Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visit Notes List */}
      {siteVisitNotes.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            No site visit notes recorded yet.
          </p>
        </div>
      ) : (
        siteVisitNotes.map((visit) => (
          <div key={visit.id} className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span style={{ fontSize: "0.9rem" }} className="font-semibold">{visit.date}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${
                      n <= visit.studentEngagement ? "text-amber-500 fill-amber-500" : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                Observations
              </p>
              <p style={{ fontSize: "0.85rem" }} className="text-foreground leading-relaxed">
                {visit.observations}
              </p>
            </div>
            {visit.companyFeedback && (
              <div>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Company Feedback
                </p>
                <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground leading-relaxed">
                  {visit.companyFeedback}
                </p>
              </div>
            )}
            {visit.recommendations && (
              <div>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Recommendations
                </p>
                <p style={{ fontSize: "0.85rem" }} className="text-muted-foreground leading-relaxed">
                  {visit.recommendations}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
