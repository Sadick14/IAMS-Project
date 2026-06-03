import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AuthUser, ExtendedRole } from "../services/auth-service";
import { subscribe, getState, type StoreState } from "./store";

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
  if (role === "academic_supervisor") return "academic";
  if (role === "industry_supervisor") return "supervisor";
  return role as ExtendedRole;
}

function normalizeApiUser(u: any): AuthUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: normalizeRole(u.role),
    department: typeof u.department === "string" ? u.department : (u.department?.name ?? undefined),
    studentId: u.student_id ?? u.studentId ?? undefined,
    avatar: u.avatar ?? u.profile_photo ?? "",
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

  const setUser = (u: AuthUser | null) => {
    saveUser(u);
    setUserState(u);
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
