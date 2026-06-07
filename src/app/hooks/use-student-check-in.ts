import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api-client";

const ACTIVE_INTERNSHIP_STATUSES = new Set(["active", "approved"]);
const CHECKED_IN_ATTENDANCE_STATUSES = new Set(["present", "late", "half_day"]);

function todayDateString() {
  return new Date().toISOString().split("T")[0];
}

function attendanceRecordsFrom(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data?.attendance ?? [];
}

export function isActiveInternshipStatus(status?: string | null) {
  return !!status && ACTIVE_INTERNSHIP_STATUSES.has(status);
}

export function isCheckedInAttendanceRecord(record: any) {
  return CHECKED_IN_ATTENDANCE_STATUSES.has(record?.status);
}

export function findActiveInternship(internships: any[]) {
  return internships.find((i: any) => isActiveInternshipStatus(i.status)) ?? internships[0] ?? null;
}

export function useStudentCheckIn(enabled = true) {
  const [activeInternship, setActiveInternship] = useState<any | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setActiveInternship(null);
      setCheckedInToday(false);
      return;
    }

    setLoading(true);
    try {
      const internshipsRes = await apiClient.getInternships();
      const internships = Array.isArray(internshipsRes.data) ? internshipsRes.data : [];
      const internship = internshipsRes.success ? findActiveInternship(internships) : null;
      setActiveInternship(internship);

      if (!internship?.id || !isActiveInternshipStatus(internship.status)) {
        setCheckedInToday(false);
        return;
      }

      const today = todayDateString();

      // Check local storage first for immediate feedback
      const localKey = `check_in_${internship.id}_${today}`;
      const localData = localStorage.getItem(localKey);
      if (localData) {
        console.log("Using local check-in data");
        setCheckedInToday(true);
        setLoading(false);
        return;
      }

      // Fall back to API
      const attendanceRes = await apiClient.getInternshipAttendance(String(internship.id), {
        from_date: today,
        to_date: today,
      });
      const records = attendanceRes.success ? attendanceRecordsFrom(attendanceRes.data) : [];
      setCheckedInToday(records.some(isCheckedInAttendanceRecord));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    activeInternship,
    checkedInToday,
    loading,
    refresh,
  };
}
