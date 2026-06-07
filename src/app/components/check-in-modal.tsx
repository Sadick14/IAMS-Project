import { useState, useEffect, useRef } from "react";
import { MapPin, X, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";
import { isCheckedInAttendanceRecord } from "../hooks/use-student-check-in";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  internshipId?: number;
  internshipStatus?: string;
}

interface LocationData {
  address?: string;
  street?: string;
  city?: string;
  company?: string;
  area?: string;
}

export function CheckInModal({ isOpen, onClose, onSuccess, internshipId, internshipStatus }: CheckInModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [checkInType, setCheckInType] = useState<"gps" | "manual">("gps");
  const [locationDetails, setLocationDetails] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [checkInTime, setCheckInTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const inFlightRef = useRef(false);

  // Check if internship is active for check-in
  const isInternshipActive = internshipStatus === "active" || internshipStatus === "approved";
  const canCheckIn = !!internshipId && isInternshipActive;

  // Reverse geocode coordinates to get address
  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        const locationInfo: LocationData = {
          address: data.display_name,
          street: addr.road || addr.street || "",
          city: addr.city || addr.town || addr.village || "",
          company: addr.building || addr.amenity || "",
          area: addr.suburb || addr.district || addr.county || "",
        };
        setLocationData(locationInfo);

        const parts = [];
        if (locationInfo.company) parts.push(locationInfo.company);
        if (locationInfo.street) parts.push(locationInfo.street);
        if (locationInfo.area) parts.push(locationInfo.area);
        if (locationInfo.city) parts.push(locationInfo.city);

        const readableLocation = parts.length > 0
          ? parts.join(", ")
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        setLocationDetails(readableLocation);
        toast.success("Location identified!");
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      setLocationDetails(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setLocationData({ address: "Location retrieved via GPS" });
      toast.info("Using GPS coordinates");
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleClose = () => {
    setLocationDetails("");
    setLat(null);
    setLng(null);
    setCheckInTime("");
    setLocationData(null);
    setCheckInType("gps");
    setGpsError(null);
    onClose();
  };

  useEffect(() => {
    const hydrateExistingCheckIn = async () => {
      if (!isOpen || !canCheckIn || !internshipId) return;

      setIsLoadingExisting(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await apiClient.getInternshipAttendance(String(internshipId), {
          from_date: today,
          to_date: today,
        });

        if (!res.success) {
          console.warn("Failed to fetch existing check-in:", res.message);
          setIsLoadingExisting(false);
          return;
        }

        const records = Array.isArray(res.data) ? res.data : res.data?.attendance ?? [];
        const existing = records.find(isCheckedInAttendanceRecord);

        if (!existing) {
          setIsLoadingExisting(false);
          return;
        }

        setCheckInType(existing.gps_check_in_lat != null && existing.gps_check_in_lng != null ? "gps" : "manual");
        setLat(existing.gps_check_in_lat ?? null);
        setLng(existing.gps_check_in_lng ?? null);
        setCheckInTime(
          existing.check_in_time
            ? existing.check_in_time.includes("T")
              ? new Date(existing.check_in_time).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })
              : existing.check_in_time
            : ""
        );
        setLocationDetails(existing.notes ?? "");
        setLocationData(
          existing.gps_check_in_lat != null && existing.gps_check_in_lng != null
            ? {
                address: existing.notes ?? "Location retrieved via GPS",
              }
            : null
        );
      } catch (error) {
        console.error("Error hydrating existing check-in:", error);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    hydrateExistingCheckIn();
  }, [canCheckIn, internshipId, isOpen]);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setGpsError(null);

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    setCheckInTime(timeString);

    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log("GPS Location captured:", latitude, longitude);
        setLat(latitude);
        setLng(longitude);
        setGpsError(null);
        toast.success("GPS captured!");
        reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "Unable to get location. Try manual entry.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Enable location in browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Try manual entry.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Check internet and try again.";
            break;
        }

        setGpsError(errorMessage);
        toast.error(errorMessage);
        setCheckInType("manual");
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
      toast.error("Check-in only available during active internship.");
      return;
    }
    if (!locationDetails && checkInType === "gps") {
      toast.error("Please capture GPS location first.");
      return;
    }
    if (checkInType === "manual" && !locationDetails.trim()) {
      toast.error("Please enter your location.");
      return;
    }

    inFlightRef.current = true;
    setIsSubmitting(true);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 8);
    const checkInDateTime = `${today}T${timeStr}`;

    try {
      const res = await apiClient.checkIn({
        internship_id: internshipId!,
        check_in_time: checkInDateTime,
        gps_check_in_lat: lat ?? undefined,
        gps_check_in_lng: lng ?? undefined,
        notes: locationDetails || undefined,
        status: "present",
      });

      if (!res.success) {
        toast.error(res.message ?? "Check-in failed.");
        return;
      }

      toast.success("Checked in successfully!");
      setLocationDetails("");
      setLat(null);
      setLng(null);
      setCheckInTime("");
      setLocationData(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("An unexpected error occurred during check-in");
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const hasLocationData = !!(locationDetails && lat != null && lng != null);
  const alreadyCheckedIn = hasLocationData && !!checkInTime;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl max-h-[70vh] md:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Daily Check-in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {checkInTime ? `Checked in at ${checkInTime}` : "Record your attendance"}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {alreadyCheckedIn ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-center gap-3 animate-in fade-in duration-300">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div className="text-center">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Checked In</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {checkInTime ? `Recorded at ${checkInTime}` : "You're all set for today"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">Captured location</p>
                <p className="text-muted-foreground">{locationDetails || "No location details available"}</p>
                {lat != null && lng != null && (
                  <p className="text-xs text-muted-foreground">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" /> Close
              </button>
            </div>
          ) : (
            <>
              {/* GPS Capture Button */}
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation || isLoadingExisting || !canCheckIn || hasLocationData}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  hasLocationData
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                } ${(isGettingLocation || isLoadingExisting) ? "opacity-75" : ""} ${!canCheckIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingExisting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Loading check-in...</>
                ) : isGettingLocation ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                ) : hasLocationData ? (
                  <><CheckCircle2 className="w-4 h-4" /> Location captured</>
                ) : (
                  <><MapPin className="w-4 h-4" /> Capture GPS Location</>
                )}
              </button>

              {/* Manual Entry */}
              {!hasLocationData && (
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => {
                    setCheckInType("manual");
                    setLocationDetails(e.target.value);
                  }}
                  placeholder="Or enter location manually"
                  disabled={!canCheckIn}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              )}

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
                  disabled={isSubmitting || !locationDetails || !canCheckIn}
                  className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                    isSubmitting || !locationDetails || !canCheckIn
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
                onClick={handleClose}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors"
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
