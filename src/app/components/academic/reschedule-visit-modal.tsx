import { useState, useEffect } from "react";
import { X, Calendar } from "lucide-react";

interface RescheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  onReschedule: (rescheduleData: { date: string; time: string; reason: string }) => void;
}

export function RescheduleVisitModal({
  isOpen,
  onClose,
  visit,
  onReschedule,
}: RescheduleVisitModalProps) {
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "", reason: "" });

  useEffect(() => {
    if (visit) {
      setRescheduleForm({
        date: visit.date || "",
        time: visit.time || "",
        reason: "",
      });
    }
  }, [visit]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!rescheduleForm.date || !rescheduleForm.time) return;
    onReschedule(rescheduleForm);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3>Reschedule Site Visit</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: "0.8rem" }}>New Date *</label>
              <input
                type="date"
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem" }}>New Time *</label>
              <input
                type="time"
                value={rescheduleForm.time}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
            <div className="md:col-span-2">
              <label style={{ fontSize: "0.8rem" }}>Reason (optional)</label>
              <textarea
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                placeholder="Why is the visit being rescheduled?"
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
              disabled={!rescheduleForm.date || !rescheduleForm.time}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-medium transition-opacity"
              style={{ fontSize: "0.85rem" }}
            >
              <Calendar className="w-4 h-4" /> Reschedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
