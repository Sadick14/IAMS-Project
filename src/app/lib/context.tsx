import { createContext, useContext, useState, useSyncExternalStore, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import type { AuthUser, ExtendedRole } from "../services/auth-service";
import { subscribe, getState, type StoreState } from "./store";
import { setCurrentUser, apiClient } from "./api-client";
import { isPWAInstalled } from "./pwa-utils";

interface AppContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  store: StoreState;
  selectedTermId: string | null;
  setSelectedTermId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
  store: getState(),
  selectedTermId: null,
  setSelectedTermId: () => {},
});

const USER_KEY = "iams_user";

function normalizeRole(role: string): ExtendedRole {
  if (role === "academic_supervisor" || role === "academic-supervisor") return "academic";
  if (role === "industry_supervisor" || role === "industry-supervisor") return "supervisor";
  return role as ExtendedRole;
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local.split(/[._-]+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function isGenericName(name: unknown): boolean {
  if (!name) return true;
  const s = String(name).trim().toLowerCase();
  return s === "" || s === "user" || s === "null" || s === "undefined";
}

function normalizeApiUser(u: any): AuthUser {
  return {
    id: String(u.id),
    name: isGenericName(u.name) && u.email ? nameFromEmail(u.email) : (u.name || undefined),
    email: u.email,
    role: normalizeRole(u.role),
    phone: u.phone ?? u.student_profile?.phone ?? u.student_profile?.user?.phone ?? undefined,
    emergencyContact: u.emergency_contact ?? u.emergency_contact_name ?? u.student_profile?.emergency_contact_name ?? u.student_profile?.emergency_contact ?? undefined,
    emergencyPhone: u.emergency_phone ?? u.emergency_contact_phone ?? u.student_profile?.emergency_contact_phone ?? undefined,
    department: typeof u.department === "string" ? u.department
      : (u.department?.name
        ?? u.department_head?.department?.name
        ?? u.academic_supervisor?.department?.name
        ?? undefined),
    department_id: u.department_id ?? u.departmentId ?? u.department?.id
      ?? u.department_head?.department?.id ?? u.department_head?.department_id
      ?? u.academic_supervisor?.department?.id ?? u.academic_supervisor?.department_id
      ?? undefined,
    studentId: u.student_id ?? u.studentId ?? undefined,
    avatar: u.avatar ?? u.profile_photo ?? "",
    profileComplete: u.profile_complete ?? u.profileComplete ?? false,
  };
}

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (!stored) return null;
    const u: AuthUser = JSON.parse(stored);
    // Apply email-name fallback immediately so the UI never flashes "User"
    if (isGenericName(u.name) && u.email) {
      return { ...u, name: nameFromEmail(u.email) };
    }
    return u;
  } catch { return null; }
}

function saveUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(loadUser);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTermId, setSelectedTermIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem("iams_selected_term_id");
    } catch { return null; }
  });

  const setSelectedTermId = (id: string | null) => {
    try {
      if (id) localStorage.setItem("iams_selected_term_id", id);
      else localStorage.removeItem("iams_selected_term_id");
    } catch {}
    setSelectedTermIdState(id);
  };

  const store = useSyncExternalStore(subscribe, getState, getState);

  // Track which user ID we have already backfilled so the effect doesn't
  // re-run after it writes studentId/department back into state.
  const backfilledRef = useRef<string | null>(null);

  // SECURITY: Sync loaded user to API client on mount AND refetch if incomplete
  useEffect(() => {
    if (!user?.id || !user?.role) {
      setCurrentUser(null);
      return;
    }

    setCurrentUser({
      id: user.id,
      role: user.role,
      department_id: user.department_id,
      student_id: user.id,
    });

    // Only backfill once per user session to avoid a state-update loop.
    if (backfilledRef.current === user.id) return;
    backfilledRef.current = user.id;

    const backfill = async () => {
      // If user is missing name/email or has a generic placeholder name, refetch from API
      if (isGenericName(user.name) || !user.email) {
        try {
          const res = await apiClient.me();
          if (res?.success && res?.data) {
            const rawUser = (res.data as any).user ?? res.data;
            const freshUser = normalizeApiUser(rawUser);
            setUserState(freshUser);
            saveUser(freshUser);
            setCurrentUser({
              id: freshUser.id,
              role: freshUser.role,
              department_id: freshUser.department_id,
              student_id: freshUser.id,
            });
          }
        } catch {
          // Silently fail — keep the user we have
        }
      }

      // Students' studentId/department live on the `students` table, not `users` —
      // the /me response above won't carry them, so backfill from the student profile.
      if (user.role === "student") {
        try {
          const res = await apiClient.getStudentProfile(user.id);
          if (res.success && res.data) {
            const p: any = res.data;
            const studentId = user.studentId || p.student_id || undefined;
            const department =
              user.department || p.department_name ||
              (typeof p.department === "string" ? p.department : p.department?.name) || undefined;
            const department_id = user.department_id ?? p.department_id ?? undefined;
            const phone = user.phone || p.phone || p.user?.phone || undefined;
            const emergencyContact = user.emergencyContact || p.emergency_contact_name || p.emergency_contact || undefined;
            const emergencyPhone = user.emergencyPhone || p.emergency_contact_phone || undefined;
            if (
              studentId !== user.studentId ||
              department !== user.department ||
              department_id !== user.department_id ||
              phone !== user.phone ||
              emergencyContact !== user.emergencyContact ||
              emergencyPhone !== user.emergencyPhone
            ) {
              const merged: AuthUser = { ...user, studentId, department, department_id, phone, emergencyContact, emergencyPhone };
              setUserState(merged);
              saveUser(merged);
              setCurrentUser({
                id: merged.id,
                role: merged.role,
                department_id: merged.department_id,
                student_id: merged.id,
              });
            }
          }
        } catch {
          // Silently fail — keep the user we have
        }
      }
    };

    backfill();
  }, [user?.id, user?.role, user?.department_id]);

  // ── INACTIVITY TIMEOUT & ACTIVE PRESENCE HEARTBEAT ──
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user?.id) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));

    // Dual-strategy inactivity limit:
    // PWA / Installed Mobile app users: 30 days persistent login
    // Web Browser users: 8 hours (workday shift timeout)
    const isPWA = isPWAInstalled();
    const INACTIVITY_LIMIT_MS = isPWA
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 8 * 60 * 60 * 1000;      // 8 hours

    const checkInactivityInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT_MS) {
        setUserState(null);
        saveUser(null);
        setCurrentUser(null);
        apiClient.setToken(null);
        toast.error("Session expired due to inactivity. Please log in again.");
        window.location.href = "/login";
      }
    }, 60_000);

    // Active Site Presence Heartbeat (every 30s when tab is visible)
    const sendHeartbeatIfActive = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivityRef.current < INACTIVITY_LIMIT_MS) {
        apiClient.sendHeartbeat().catch(() => {});
      }
    };

    sendHeartbeatIfActive();
    const heartbeatInterval = setInterval(sendHeartbeatIfActive, 30_000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      clearInterval(checkInactivityInterval);
      clearInterval(heartbeatInterval);
    };
  }, [user?.id]);

  const setUser = (u: AuthUser | null) => {
    saveUser(u);
    setUserState(u);
    // SECURITY: Sync user to API client for supervisor context in requests
    if (u && u.id && u.role) {
      setCurrentUser({ 
        id: u.id, 
        role: u.role, 
        department_id: u.department_id,
        student_id: u.id
      });
    } else {
      setCurrentUser(null);
    }
  };

  return (
    <AppContext.Provider value={{ user, setUser, sidebarOpen, setSidebarOpen, store, selectedTermId, setSelectedTermId }}>
      {children}
    </AppContext.Provider>
  );
}

export { normalizeApiUser };

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

export function useRole(): ExtendedRole | null {
  const { user } = useAppContext();
  return user?.role ?? null;
}
