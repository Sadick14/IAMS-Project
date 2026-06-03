import { useState, useEffect } from "react";
import { MapPin, X, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";

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
      setLocationDetails("");
      setLat(null);
      setLng(null);
      setCheckInTime("");
      setLocationData(null);
      onSuccess?.();
      onClose();
    } else {
      toast.error(res.message ?? "Check-in failed.");
    }
  };

  const hasLocationData = !!(locationDetails && lat && lng);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
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

        <div className="p-6 space-y-5">
          {/* Status Warning */}
          {!canCheckIn && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300 text-sm">Check-in Unavailable</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Only available during active internship. Status: <span className="font-semibold capitalize">{internshipStatus}</span>
                </p>
              </div>
            </div>
          )}

          {/* Location Method Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Check-in Method</label>
            <div className="grid grid-cols-2 gap-3">
              {(["gps", "manual"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCheckInType(type)}
                  disabled={!canCheckIn}
                  className={`p-3 rounded-lg border-2 transition-all font-medium text-sm flex items-center justify-center gap-2 ${
                    checkInType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 text-foreground"
                  } ${!canCheckIn ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {type === "gps" ? <MapPin className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {type === "gps" ? "GPS" : "Manual"}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Method */}
          {checkInType === "gps" ? (
            <div className="space-y-4">
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation || !canCheckIn || hasLocationData}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  hasLocationData
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                } ${isGettingLocation ? "opacity-75" : ""} ${!canCheckIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isGettingLocation ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                ) : hasLocationData ? (
                  <><CheckCircle2 className="w-4 h-4" /> Location captured</>
                ) : (
                  <><MapPin className="w-4 h-4" /> Capture GPS Location</>
                )}
              </button>

              {/* GPS Error */}
              {gpsError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{gpsError}</p>
                </div>
              )}

              {/* Location Display */}
              {hasLocationData && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">LOCATION</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-1">{locationDetails}</p>
                  </div>
                  {locationData?.city && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      📍 {locationData.city}{locationData.area && `, ${locationData.area}`}
                    </p>
                  )}
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-400">
                    <p>Lat: {lat?.toFixed(4)}, Lng: {lng?.toFixed(4)}</p>
                  </div>
                </div>
              )}

              {!hasLocationData && !gpsError && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                  📍 Click "Capture GPS Location" to record your position
                </div>
              )}
            </div>
          ) : (
            /* Manual Method */
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Describe Your Location</label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g., Office Floor 2, Ghana Telecom"
                className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              onClick={handleClose}
              className="flex-1 py-3 border border-border rounded-lg hover:bg-accent font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting || !locationDetails || !canCheckIn}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                isSubmitting || !locationDetails || !canCheckIn
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking in...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Confirm Check-in</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
