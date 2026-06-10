import { useState, useEffect, useRef } from "react";
import { MapPin, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  internshipId?: number;
  internshipStatus?: string;
}

export function CheckInModal({ isOpen, onClose, onSuccess, internshipId, internshipStatus }: CheckInModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationDetails, setLocationDetails] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkedInTime, setCheckedInTime] = useState<string | null>(null);
  const [internshipDates, setInternshipDates] = useState<{ start?: string; end?: string } | null>(null);
  const [outsideInternshipPeriod, setOutsideInternshipPeriod] = useState(false);
  const [tooEarlyForInternship, setTooEarlyForInternship] = useState(false);
  const inFlightRef = useRef(false);

  const isInternshipActive = internshipStatus === "active" || internshipStatus === "approved";
  const canCheckIn = !!internshipId && isInternshipActive && !tooEarlyForInternship;
  const isCheckedIn = !!checkedInTime && !!locationDetails;

  // Load existing check-in on modal open
  useEffect(() => {
    if (!isOpen || !internshipId) return;

    const loadCheckInStatus = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        // Get internship details to check if today is within the internship period
        const internships = await apiClient.getInternships();
        const internship = internships.data?.find((i: any) => String(i.id) === String(internshipId));

        if (internship?.start_date && internship?.end_date) {
          setInternshipDates({ start: internship.start_date, end: internship.end_date });

          // Check if today is within internship period
          const startDate = new Date(internship.start_date);
          const endDate = new Date(internship.end_date);
          const todayDate = new Date(today);

          if (todayDate < startDate) {
            setTooEarlyForInternship(true);
            setOutsideInternshipPeriod(true);
          } else if (todayDate > endDate) {
            setOutsideInternshipPeriod(true);
          } else {
            setTooEarlyForInternship(false);
            setOutsideInternshipPeriod(false);
          }
        }

        const res = await apiClient.getInternshipAttendance(String(internshipId), {
          from_date: today,
          to_date: today,
        });

        if (!res.success) return;

        const records = Array.isArray(res.data) ? res.data : [];
        const todayRecord = records.find((r: any) => r.status === "present" || r.status === "late" || r.status === "half_day");

        if (todayRecord) {
          setCheckedInTime(todayRecord.check_in_time);
          setLocationDetails(todayRecord.notes || "");
          setLat(todayRecord.gps_check_in_lat || null);
          setLng(todayRecord.gps_check_in_lng || null);
        }
      } catch (error) {
        console.error("Error loading check-in status:", error);
      }
    };

    loadCheckInStatus();
  }, [isOpen, internshipId]);

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setGpsError(null);

    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        setLocationDetails(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        toast.success("GPS location captured!");
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        setGpsError(errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleCheckIn = async () => {
    if (inFlightRef.current) return;
    if (!canCheckIn) {
      toast.error("Check-in only available during active internship");
      return;
    }
    if (!locationDetails.trim()) {
      toast.error("Please enter or capture your location");
      return;
    }

    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      // Save to localStorage first for immediate UI feedback
      const today = now.toISOString().split("T")[0];
      const localKey = `check_in_${internshipId}_${today}`;
      localStorage.setItem(localKey, JSON.stringify({
        time: timeStr,
        location: locationDetails,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      }));

      // Dispatch custom event to notify header
      window.dispatchEvent(new CustomEvent("checkInUpdated", {
        detail: { internshipId, today, time: timeStr }
      }));

      // Call API with date
      const res = await apiClient.checkIn({
        internship_id: internshipId!,
        date: today,
        check_in_time: timeStr,
        gps_check_in_lat: lat ?? undefined,
        gps_check_in_lng: lng ?? undefined,
        notes: locationDetails || undefined,
        status: "present",
      });

      if (!res.success) {
        toast.error(res.message ?? "Check-in failed");
        inFlightRef.current = false;
        setIsSubmitting(false);
        return;
      }

      setCheckedInTime(timeStr);
      toast.success("Checked in successfully!");

      // Call onSuccess callback FIRST to refresh header state
      if (onSuccess) {
        await onSuccess();
      }

      // Close after success callback completes
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("An error occurred during check-in");
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Daily Check-in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isCheckedIn ? `Checked in at ${checkedInTime}` : "Record your attendance"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning if outside internship period */}
          {tooEarlyForInternship && (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-300">Internship Not Started</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Your internship is scheduled to start on {internshipDates?.start ? new Date(internshipDates.start).toLocaleDateString() : "—"}. Check-in will be available from that date.
                </p>
              </div>
            </div>
          )}

          {!tooEarlyForInternship && outsideInternshipPeriod && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-300">Outside Internship Period</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Your internship period has ended. Check-ins are no longer required.
                </p>
              </div>
            </div>
          )}

          {isCheckedIn ? (
            <>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div className="text-center">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Checked In</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    At {checkedInTime}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">Location</p>
                <p className="text-muted-foreground">{locationDetails}</p>
                {lat && lng && (
                  <p className="text-xs text-muted-foreground">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Close
              </button>
            </>
          ) : (
            <>
              {/* Location Input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Location *</label>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Enter location manually or use GPS below"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              {/* GPS Button */}
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation || isSubmitting || !canCheckIn}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  lat && lng
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                } ${isGettingLocation ? "opacity-75" : ""} ${!canCheckIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isGettingLocation ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                ) : lat && lng ? (
                  <><CheckCircle2 className="w-4 h-4" /> Location captured</>
                ) : (
                  <><MapPin className="w-4 h-4" /> Capture GPS Location</>
                )}
              </button>

              {/* GPS Error */}
              {gpsError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2.5 flex gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-300">{gpsError}</p>
                </div>
              )}

              {/* Check-in Button */}
              <button
                onClick={handleCheckIn}
                disabled={isSubmitting || !locationDetails.trim() || !canCheckIn}
                className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                  isSubmitting || !locationDetails.trim() || !canCheckIn
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking in...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Check-in</>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
