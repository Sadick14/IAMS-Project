import { useState, useEffect } from "react";
import { MapPin, X, CheckCircle2, Clock, ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  internshipId?: number;
}

interface LocationData {
  address?: string;
  street?: string;
  city?: string;
  company?: string;
  area?: string;
}

export function CheckInModal({ isOpen, onClose, onSuccess, internshipId }: CheckInModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [checkInType, setCheckInType] = useState<"gps" | "manual">("gps");
  const [locationDetails, setLocationDetails] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!isOpen) return null;

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLng(longitude);
          toast.success("GPS captured! Identifying location...");
          reverseGeocodeLocation(latitude, longitude);
          setIsGettingLocation(false);
        },
        (error) => {
          // Fallback to Ho Technical University, Ghana
          const fallbackLat = 6.6111;
          const fallbackLng = -0.4704;
          setLat(fallbackLat);
          setLng(fallbackLng);
          setLocationDetails("Ho Technical University, Ghana");
          setLocationData({
            address: "Ho Technical University",
            street: "Main Campus",
            city: "Ho",
            area: "Volta Region",
            company: "Ho Technical University",
          });
          setIsGettingLocation(false);
          toast.info("Using default location (permission denied)");
        }
      );
    } else {
      setLocationDetails("Manual location");
      setIsGettingLocation(false);
      toast.error("Geolocation not supported");
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

              {(locationDetails || isReverseGeocoding) && lat && lng && (
                <div className="space-y-3">
                  {/* Location Success */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
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
