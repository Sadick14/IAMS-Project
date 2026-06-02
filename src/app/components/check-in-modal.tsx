import { useState, useEffect } from "react";
import { MapPin, X, CheckCircle2, Clock, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
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
      // Use OpenStreetMap Nominatim API for reverse geocoding (free, no key required)
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

        // Build a readable location string
        const parts = [];
        if (locationInfo.company) parts.push(locationInfo.company);
        if (locationInfo.street) parts.push(locationInfo.street);
        if (locationInfo.area) parts.push(locationInfo.area);
        if (locationInfo.city) parts.push(locationInfo.city);

        const readableLocation = parts.length > 0
          ? parts.join(", ")
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

        setLocationDetails(readableLocation);
        toast.success("Location identified successfully!");
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      // Fallback to coordinates
      setLocationDetails(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setLocationData({ address: "Location retrieved via GPS" });
      toast.info("Using GPS coordinates (address lookup unavailable)");
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

    // Capture check-in time
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
        toast.success("GPS captured! Identifying location...");
        reverseGeocodeLocation(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = "";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Please enable location access in your browser settings and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information is unavailable. Please try again or use manual entry.";
            break;
          case error.TIMEOUT:
            errorMessage =
              "Location request timed out. Please check your internet connection and try again.";
            break;
          default:
            errorMessage = "Unable to get your location. Please try again or use manual entry.";
        }

        setGpsError(errorMessage);
        toast.error(errorMessage);
        console.error("Geolocation error:", error);

        // Switch to manual entry to let user enter location manually
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
      toast.error("Check-in is only available during an active internship period.");
      return;
    }
    if (!locationDetails && checkInType === "gps") {
      toast.error("Please capture your GPS location first.");
      return;
    }
    if (checkInType === "manual" && !locationDetails.trim()) {
      toast.error("Please describe your location.");
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3>Daily Check-in</h3>
            <button onClick={handleClose} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
          </div>

          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Record your attendance for today before submitting logbook entries.
          </p>

          {/* Internship Status Warning */}
          {!canCheckIn && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium" style={{ fontSize: "0.85rem" }}>
                  Check-in Not Available
                </p>
                <p className="text-red-600 dark:text-red-400 text-sm mt-0.5">
                  Check-in is only available during an active internship period. {internshipStatus && <>Your current internship status is: <span className="font-semibold capitalize">{internshipStatus}</span></>}
                </p>
              </div>
            </div>
          )}

          {/* Check-in type */}
          <div className="grid grid-cols-2 gap-3">
            {(["gps", "manual"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setCheckInType(type)}
                disabled={!canCheckIn}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                  !canCheckIn
                    ? "border-border/50 text-muted-foreground/50 cursor-not-allowed opacity-60"
                    : checkInType === type ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent"
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
                disabled={isGettingLocation || !canCheckIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-60 font-medium"
                style={{ fontSize: "0.85rem" }}
              >
                {isGettingLocation
                  ? <><Clock className="w-4 h-4 animate-spin" /> Getting your exact location…</>
                  : <><MapPin className="w-4 h-4" /> Capture GPS Location</>}
              </button>

              {/* GPS Error Message */}
              {gpsError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-700 dark:text-red-300 font-medium text-sm">{gpsError}</p>
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                        Switch to manual entry below to describe your location instead.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(locationDetails || isReverseGeocoding) && lat && lng && (
                <div className="space-y-3">
                  {/* Location Success */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      {isReverseGeocoding ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-emerald-700 dark:text-emerald-300 font-medium" style={{ fontSize: "0.85rem" }}>
                          {isReverseGeocoding ? "Identifying location..." : "Location captured"}
                        </p>
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1" style={{ fontSize: "0.9rem" }}>
                          {locationDetails}
                        </p>
                      </div>
                    </div>

                    {/* Check-in Time Display */}
                    {checkInTime && !isReverseGeocoding && (
                      <div className="flex items-center gap-3 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                        <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">Check-in Time</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold" style={{ fontSize: "0.95rem" }}>
                            {checkInTime}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Location Details */}
                    {locationData && !isReverseGeocoding && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 space-y-1 mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                        {locationData.company && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Facility:</span>
                            <span>{locationData.company}</span>
                          </div>
                        )}
                        {locationData.street && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Street:</span>
                            <span>{locationData.street}</span>
                          </div>
                        )}
                        {locationData.area && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Area:</span>
                            <span>{locationData.area}</span>
                          </div>
                        )}
                        {locationData.city && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">City:</span>
                            <span>{locationData.city}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Coordinates:</span>
                          <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isReverseGeocoding && (
                    <>
                      {/* Map Preview - OpenStreetMap with proper attribution */}
                      <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
                        <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/10 flex items-center justify-center relative overflow-hidden">
                          <iframe
                            title="OpenStreetMap Location"
                            width="100%"
                            height="100%"
                            style={{ border: "none" }}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.01).toFixed(4)},${(lat - 0.01).toFixed(4)},${(lng + 0.01).toFixed(4)},${(lat + 0.01).toFixed(4)}&layer=mapnik&marker=${lat.toFixed(4)},${lng.toFixed(4)}`}
                          />
                        </div>
                        <div className="bg-muted/50 px-2 py-1 text-xs text-muted-foreground text-center">
                          Map © OpenStreetMap contributors
                        </div>
                      </div>

                      {/* View in Maps Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=18`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          OpenStreetMap
                        </a>
                        <a
                          href={`https://maps.google.com/?q=${lat},${lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Google Maps
                        </a>
                      </div>
                    </>
                  )}
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
            <button onClick={handleClose} className="flex-1 py-2 border border-border rounded-lg hover:bg-accent font-medium" style={{ fontSize: "0.85rem" }}>
              Cancel
            </button>
            <button
              onClick={handleCheckIn}
              disabled={isSubmitting || !locationDetails || !canCheckIn}
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
