import { useState } from "react";
import { X, Calendar } from "lucide-react";

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedStudents: any[];
  onSchedule: (visit: { studentId: string; date: string; time: string; notes: string }) => void;
}

export function ScheduleVisitModal({
  isOpen,
  onClose,
  assignedStudents,
  onSchedule,
}: ScheduleVisitModalProps) {
  const [newVisit, setNewVisit] = useState({
    studentId: "",
    date: "",
    time: "",
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!newVisit.studentId || !newVisit.date || !newVisit.time) return;
    onSchedule(newVisit);
    setNewVisit({ studentId: "", date: "", time: "", notes: "" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3>Schedule New Site Visit</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: "0.8rem" }}>Student *</label>
              <select
                value={newVisit.studentId}
                onChange={(e) => setNewVisit({ ...newVisit, studentId: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              >
                <option value="">Select student...</option>
                {assignedStudents.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentName} — {s.companyName}
                  </option>
                ))}
              </select>
            </div>
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
              <label style={{ fontSize: "0.8rem" }}>Time *</label>
              <input
                type="time"
                value={newVisit.time}
                onChange={(e) => setNewVisit({ ...newVisit, time: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
            <div className="md:col-span-2">
              <label style={{ fontSize: "0.8rem" }}>Notes (optional)</label>
              <textarea
                value={newVisit.notes}
                onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                placeholder="Any preparation notes or agenda items..."
                rows={2}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-lg hover:bg-accent"
              style={{ fontSize: "0.85rem" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newVisit.studentId || !newVisit.date || !newVisit.time}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-medium transition-opacity"
              style={{ fontSize: "0.85rem" }}
            >
              <Calendar className="w-4 h-4" /> Schedule Visit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
