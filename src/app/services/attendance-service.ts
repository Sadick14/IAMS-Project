// Attendance tracking service
// Covers STU-ATT-01 to STU-ATT-04, IDS-11, DLO-35/36, CLO-27A, ACS-13/14

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  checkInType: "gps" | "manual";
  location: string;
  verificationStatus: "Verified" | "Pending Verification" | "Rejected";
  verifiedBy?: string;
  verifiedAt?: string;
}

const ATTENDANCE_STORAGE_KEY = "iams_attendance_records_v3";

function getInitialRecords(): AttendanceRecord[] {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load local attendance records:", e);
    }
  }
  return []; // Start fully clean for real testing!
}

// Mock attendance data
let records: AttendanceRecord[] = getInitialRecords();

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save local attendance records:", e);
    }
  }
  listeners.forEach((l) => l());
}
export function subscribeAttendance(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get all attendance records, optionally filtered.
 */
export function getAttendanceRecords(filters?: {
  department?: string;
  studentId?: string;
  dateFrom?: string;
  dateTo?: string;
}): AttendanceRecord[] {
  let result = [...records];
  if (filters?.department) result = result.filter((r) => r.department === filters.department);
  if (filters?.studentId) result = result.filter((r) => r.studentId === filters.studentId);
  if (filters?.dateFrom) result = result.filter((r) => r.date >= filters.dateFrom!);
  if (filters?.dateTo) result = result.filter((r) => r.date <= filters.dateTo!);
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Submit a check-in (student action).
 */
export function submitCheckIn(
  studentId: string,
  studentName: string,
  department: string,
  checkInType: "gps" | "manual",
  location: string
): { success: boolean; message: string } {
  const today = new Date().toISOString().split("T")[0];
  const existing = records.find((r) => r.studentId === studentId && r.date === today);
  if (existing) {
    return { success: false, message: "You have already checked in today." };
  }

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    studentId,
    studentName,
    department,
    date: today,
    checkInTime: new Date().toTimeString().slice(0, 5),
    checkInType,
    location,
    verificationStatus: checkInType === "gps" ? "Verified" : "Pending Verification",
  };
  records = [record, ...records];
  notify();
  return { success: true, message: checkInType === "gps" ? "GPS check-in recorded." : "Manual check-in submitted for verification." };
}

/**
 * Verify a manual check-in (industry supervisor action). IDS-11
 */
export function verifyCheckIn(
  recordId: string,
  approved: boolean,
  verifiedBy: string
): { success: boolean; message: string } {
  const record = records.find((r) => r.id === recordId);
  if (!record) return { success: false, message: "Record not found." };

  records = records.map((r) =>
    r.id === recordId
      ? {
          ...r,
          verificationStatus: approved ? "Verified" : "Rejected",
          verifiedBy,
          verifiedAt: new Date().toISOString(),
        }
      : r
  );
  notify();
  return { success: true, message: approved ? "Check-in verified." : "Check-in rejected. Day marked absent." };
}

/**
 * Check if student has checked in today.
 */
export function hasCheckedInToday(studentId: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return records.some((r) => r.studentId === studentId && r.date === today);
}

/**
 * Get today's check-in record for a student.
 */
export function getTodayCheckIn(studentId: string): AttendanceRecord | null {
  const today = new Date().toISOString().split("T")[0];
  return records.find((r) => r.studentId === studentId && r.date === today) || null;
}

/**
 * Get students with missed check-ins (for alerts).
 */
export function getMissedCheckIns(department?: string): { studentId: string; studentName: string; department: string; missedDays: number }[] {
  const today = new Date();
  const studentMap = new Map<string, { name: string; dept: string; lastCheckIn: string }>();

  records.forEach((r) => {
    if (department && r.department !== department) return;
    const existing = studentMap.get(r.studentId);
    if (!existing || r.date > existing.lastCheckIn) {
      studentMap.set(r.studentId, { name: r.studentName, dept: r.department, lastCheckIn: r.date });
    }
  });

  const results: { studentId: string; studentName: string; department: string; missedDays: number }[] = [];
  studentMap.forEach((val, studentId) => {
    const lastDate = new Date(val.lastCheckIn);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) {
      results.push({ studentId, studentName: val.name, department: val.dept, missedDays: diffDays });
    }
  });

  return results.sort((a, b) => b.missedDays - a.missedDays);
}

/**
 * Automatic check-out at end of working day (17:00/5:00 PM).
 * This runs automatically to check out all students who checked in today.
 */
export function processAutomaticCheckOut(): void {
  const today = new Date().toISOString().split("T")[0];
  const checkOutTime = "17:00"; // Default end of working day

  records = records.map((r) => {
    // If record is for today and hasn't been checked out yet
    if (r.date === today && !r.checkOutTime) {
      return { ...r, checkOutTime };
    }
    return r;
  });

  notify();
}

/**
 * Initialize automatic check-out scheduler.
 * Checks every minute if it's 5:00 PM (17:00) and processes automatic check-out.
 */
let autoCheckOutInterval: number | null = null;

export function initializeAutoCheckOut(): void {
  // Clear any existing interval
  if (autoCheckOutInterval !== null) {
    clearInterval(autoCheckOutInterval);
  }

  // Check every minute (60000ms) if it's time to auto-checkout
  autoCheckOutInterval = window.setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // At 17:00 (5:00 PM), trigger automatic check-out
    if (hours === 17 && minutes === 0) {
      processAutomaticCheckOut();
    }
  }, 60000); // Check every minute
}

// Start the auto-checkout scheduler when the module loads
initializeAutoCheckOut();
