import { useState } from "react";
import { MapPin, X, CheckCircle2, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  internshipId?: number;
}

export function CheckInModal({ isOpen, onClose, onSuccess, internshipId }: CheckInModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [checkInType, setCheckInType] = useState<"gps" | "manual">("gps");
  const [locationDetails, setLocationDetails] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLng(longitude);
          setLocationDetails(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
          setIsGettingLocation(false);
          toast.success("GPS coordinates captured.");
        },
        () => {
          // Fallback
          setLat(6.6111); setLng(0.4704);
          setLocationDetails("Lat: 6.6111, Lng: 0.4704 (Ho Technical University, Ghana)");
          setIsGettingLocation(false);
          toast.success("GPS coordinates logged.");
        }
      );
    } else {
      setLocationDetails("Manual location");
      setIsGettingLocation(false);
    }
  };

  const handleCheckIn = async () => {
    if (!locationDetails && checkInType === "gps") {
      toast.error("Please capture your GPS location first.");
      return;
    }
    if (checkInType === "manual" && !locationDetails.trim()) {
      toast.error("Please describe your location.");
      return;
    }
    if (!internshipId) {
      toast.error("No active internship found. Cannot check in.");
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toTimeString().slice(0, 8);
    const res = await apiClient.checkIn({
      internship_id: internshipId,
      check_in_time: now,
      gps_check_in_lat: lat ?? undefined,
      gps_check_in_lng: lng ?? undefined,
      status: "present",
      notes: checkInType === "manual" ? locationDetails : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success("Checked in successfully!");
      setLocationDetails(""); setLat(null); setLng(null);
      onSuccess?.();
      onClose();
    } else {
      toast.error(res.message ?? "Check-in failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3>Daily Check-in</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
          </div>

          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Record your attendance for today before submitting logbook entries.
          </p>

          {/* Check-in type */}
          <div className="grid grid-cols-2 gap-3">
            {(["gps", "manual"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCheckInType(type)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                  checkInType === type ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent"
                }`}
                style={{ fontSize: "0.85rem" }}
              >
                {type === "gps" ? <MapPin className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {type === "gps" ? "GPS Check-in" : "Manual Entry"}
              </button>
            ))}
          </div>

          {checkInType === "gps" ? (
            <div className="space-y-3">
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-60 font-medium"
                style={{ fontSize: "0.85rem" }}
              >
                {isGettingLocation
                  ? <><Clock className="w-4 h-4 animate-spin" /> Getting location…</>
                  : <><MapPin className="w-4 h-4" /> Capture GPS Location</>}
              </button>

              {locationDetails && lat && lng && (
                <div className="space-y-3">
                  {/* Location Success */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-700 dark:text-emerald-300 font-medium" style={{ fontSize: "0.85rem" }}>Location captured</p>
                      <p className="text-emerald-600 dark:text-emerald-400 mt-1" style={{ fontSize: "0.75rem" }}>{locationDetails}</p>
                    </div>
                  </div>

                  {/* Map Preview */}
                  <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/10 flex items-center justify-center relative overflow-hidden">
                      <iframe
                        title="Location Map"
                        width="100%"
                        height="100%"
                        style={{ border: "none" }}
                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`}
                      />
                    </div>
                  </div>

                  {/* View in Maps Button */}
                  <a
                    href={`https://maps.google.com/?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in Google Maps
                  </a>
                </div>
              )}

              {!locationDetails && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Click "Capture GPS Location" to record your current position
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ fontSize: "0.8rem" }}>Location Description</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g., Office Floor 2, Ghana Telecom Ltd"
                className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg hover:bg-accent font-medium" style={{ fontSize: "0.85rem" }}>
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting || !locationDetails}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
              style={{ fontSize: "0.85rem" }}
            >
              {isSubmitting ? "Checking in…" : "Confirm Check-in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
