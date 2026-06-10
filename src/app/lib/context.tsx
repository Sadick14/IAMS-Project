import { createContext, useContext, useState, useSyncExternalStore, useEffect, type ReactNode } from "react";
import type { AuthUser, ExtendedRole } from "../services/auth-service";
import { subscribe, getState, type StoreState } from "./store";
import { setCurrentUser, apiClient } from "./api-client";

interface AppContextType {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  store: StoreState;
}

const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
  store: getState(),
});

const USER_KEY = "iams_user";

function normalizeRole(role: string): ExtendedRole {
  if (role === "academic_supervisor" || role === "academic-supervisor") return "academic";
  if (role === "industry_supervisor" || role === "industry-supervisor") return "supervisor";
  return role as ExtendedRole;
}

function normalizeApiUser(u: any): AuthUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: normalizeRole(u.role),
    department: typeof u.department === "string" ? u.department : (u.department?.name ?? undefined),
    department_id: u.department_id ?? u.departmentId ?? u.department?.id ?? undefined,
    studentId: u.student_id ?? u.studentId ?? undefined,
    avatar: u.avatar ?? u.profile_photo ?? "",
    profileComplete: u.profile_complete ?? u.profileComplete ?? false,
  };
}

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
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

  const store = useSyncExternalStore(subscribe, getState, getState);

  // SECURITY: Sync loaded user to API client on mount AND refetch if incomplete
  useEffect(() => {
    const refreshUser = async () => {
      if (user && user.id && user.role) {
        setCurrentUser({ 
          id: user.id, 
          role: user.role, 
          department_id: user.department_id,
          student_id: user.id // For students, the user ID is the student ID
        });
        // If user is missing name or email, refetch from API
        if (!user.name || !user.email) {
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
                student_id: freshUser.id
              });
            }
          } catch {
            // Silently fail — keep the user we have
          }
        }
      } else {
        setCurrentUser(null);
      }
    };
    refreshUser();
  }, [user?.id, user?.role, user?.department_id]);

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
    <AppContext.Provider value={{ user, setUser, sidebarOpen, setSidebarOpen, store }}>
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
