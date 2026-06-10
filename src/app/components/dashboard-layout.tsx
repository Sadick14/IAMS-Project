import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, FileText, Building2, Calendar, Users, Settings, Bell, LogOut,
  GraduationCap, ClipboardCheck, BarChart3, Menu, Shield, BookOpen, BookMarked,
  Upload, MessageSquarePlus, AlertTriangle, MapPin, UserPlus, X, User,
  Moon, Sun, ChevronDown, HelpCircle, Search, CheckCircle2, Award, Layers, TrendingUp,
  LifeBuoy
} from "lucide-react";
import { useAppContext } from "../lib/context";
import { apiClient } from "../lib/api-client";
import { useState, useEffect, useSyncExternalStore, useRef } from "react";
import type { ExtendedRole } from "../services/auth-service";
import { getSettings, updateSettings, subscribeSettings } from "../lib/settings-store";
import { setNotifications } from "../lib/store";
import { getOverdueWeeklyRubrics } from "../services/grading-service";
import { CheckInModal } from "./check-in-modal";
import { NotificationBell } from "./notification-bell";
import { useStudentCheckIn } from "../hooks/use-student-check-in";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Optional key into `useNavBadges()` — renders an amber count next to the label. */
  badgeKey?: "supervisorOverdueRubrics";
}

const cloNav: NavItem[] = [
  { to: "/clo", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clo/applications", icon: FileText, label: "Applications" },
  { to: "/clo/companies", icon: Building2, label: "Companies" },
  { to: "/clo/terms", icon: Calendar, label: "Terms" },
  { to: "/clo/users", icon: Users, label: "Users" },
  { to: "/clo/departments", icon: Layers, label: "Departments" },
  { to: "/clo/students", icon: GraduationCap, label: "Students" },
  { to: "/clo/grades", icon: ClipboardCheck, label: "Grades" },
  { to: "/clo/reports", icon: BarChart3, label: "Reports" },
  { to: "/clo/issues", icon: AlertTriangle, label: "Issues" },
  { to: "/clo/audit", icon: Shield, label: "Audit Logs" },
  { to: "/clo/templates", icon: BookOpen, label: "Templates" },
  { to: "/clo/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/clo/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/clo/settings", icon: Settings, label: "Settings" },
];

const dloNav: NavItem[] = [
  { to: "/dlo", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dlo/applications", icon: FileText, label: "Applications" },
  { to: "/dlo/companies", icon: Building2, label: "Companies" },
  { to: "/dlo/users", icon: Users, label: "Users" },
  { to: "/dlo/students", icon: GraduationCap, label: "Students" },
  { to: "/dlo/supervisors", icon: UserPlus, label: "Supervisors" },
  { to: "/dlo/assignments", icon: MapPin, label: "Assignments" },
  { to: "/dlo/final-grading", icon: Award, label: "Final Grading" },
  { to: "/dlo/grades", icon: ClipboardCheck, label: "Grades" },
  { to: "/dlo/reports", icon: BarChart3, label: "Reports" },
  { to: "/dlo/issues", icon: AlertTriangle, label: "Issues" },
  { to: "/dlo/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/dlo/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/dlo/settings", icon: Settings, label: "Settings" },
];

const studentNav: NavItem[] = [
  { to: "/student", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/student/profile-setup", icon: User, label: "My Profile" },
  { to: "/student/applications", icon: FileText, label: "Applications" },
  { to: "/student/logbook", icon: BookMarked, label: "Daily Logbook" },
  { to: "/student/attendance", icon: TrendingUp, label: "Attendance" },
  { to: "/student/documents", icon: Upload, label: "Documents" },
  { to: "/student/grades", icon: Award, label: "My Score & Evaluation" },
  { to: "/student/history", icon: Award, label: "Internship History" },
  { to: "/student/issues", icon: AlertTriangle, label: "Report Issue" },
  { to: "/student/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/student/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/student/settings", icon: Settings, label: "Settings" },
];

const supervisorNav: NavItem[] = [
  { to: "/supervisor", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/supervisor/approvals", icon: ClipboardCheck, label: "Student Approvals" },
  { to: "/supervisor/logbooks", icon: BookMarked, label: "Student Logbooks" },
  { to: "/supervisor/evaluate", icon: ClipboardCheck, label: "Assessments", badgeKey: "supervisorOverdueRubrics" },
  { to: "/supervisor/attendance", icon: MapPin, label: "Attendance" },
  { to: "/supervisor/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/supervisor/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/supervisor/settings", icon: Settings, label: "Settings" },
];

const academicNav: NavItem[] = [
  { to: "/academic", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/academic/students", icon: GraduationCap, label: "My Students" },
  { to: "/academic/evaluate", icon: ClipboardCheck, label: "Evaluations" },
  { to: "/academic/visits", icon: MapPin, label: "Site Visits" },
  { to: "/academic/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/academic/help", icon: LifeBuoy, label: "Help & Support" },
];

const hodNav: NavItem[] = [
  { to: "/hod", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/hod/users", icon: Users, label: "Users" },
  { to: "/hod/students", icon: GraduationCap, label: "Department Students" },
  { to: "/hod/approvals", icon: ClipboardCheck, label: "Grade Approvals" },
  { to: "/hod/reports", icon: BarChart3, label: "Analytics & Reports" },
  { to: "/hod/communications", icon: MessageSquarePlus, label: "Communications" },
  { to: "/hod/help", icon: LifeBuoy, label: "Help & Support" },
  { to: "/hod/settings", icon: Settings, label: "Settings" },
];

function getNavForRole(role: ExtendedRole): NavItem[] {
  switch (role) {
    case "clo": return cloNav;
    case "dlo": return dloNav;
    case "student": return studentNav;
    case "supervisor": return supervisorNav;
    case "academic": return academicNav;
    case "hod": return hodNav;
    default: return [];
  }
}

function getRoleLabel(role: ExtendedRole): string {
  switch (role) {
    case "clo": return "Central Liaison";
    case "dlo": return "Dept. Liaison";
    case "student": return "Student";
    case "supervisor": return "Industry Supervisor";
    case "academic": return "Academic Supervisor";
    case "hod": return "Head of Department";
    default: return "";
  }
}

export function DashboardLayout() {
  const { user, setUser, sidebarOpen, setSidebarOpen, store } = useAppContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);

  const {
    activeInternship,
    checkedInToday,
    refresh: refreshCheckInStatus,
  } = useStudentCheckIn(user?.role === "student");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const settings = useSyncExternalStore(subscribeSettings, getSettings);

  if (!user) return null;

  const nav = getNavForRole(user.role);
  const unread = store.notifications.filter((n) => !n.read).length + (store.announcementUnread ?? 0);

  // Per-role nav badges. Recomputed on every store change because `store` is reactive.
  const navBadges: Record<NonNullable<NavItem["badgeKey"]>, number> = {
    supervisorOverdueRubrics:
      user.role === "supervisor"
        // Touch the slices we care about so the count refreshes when entries are added/applications change.
        ? (store.weeklyRubrics.length, store.applications.length,
          getOverdueWeeklyRubrics({ companyName: "Ghana Telecom Ltd" }).length)
        : 0,
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.clear();
    } catch {}
    navigate("/login", { replace: true });
  };

  const handleNavClick = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const toggleTheme = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  // Main nav items only (Settings, Help, Logout moved to profile dropdown)
  const mainNav = nav.filter(item => item.label !== "Settings");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-[272px] transform transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : `${sidebarOpen ? "w-[272px]" : "w-[88px]"} transition-all duration-300 ease-out`
          }
          flex flex-col shrink-0
        `}
      >
        {/* Sidebar inner container with glassmorphism */}
        <div
          className="flex flex-col flex-1 m-3 rounded-2xl overflow-hidden backdrop-blur-md border border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-900/40"
          style={{
            boxShadow: "0 8px 32px rgba(31, 38, 135, 0.15), 0 2px 8px rgba(31, 38, 135, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.2)"
          }}
        >
          {/* Logo */}
          <div className={`flex items-center ${sidebarOpen || isMobile ? "gap-3 px-5" : "justify-center px-0"} py-5 transition-all duration-300`}>
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            {(sidebarOpen || isMobile) && (
              <span className="text-foreground truncate" style={{ fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.01em" }}>HTU IAMS</span>
            )}
            {isMobile && sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 text-muted-foreground transition-colors duration-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Menu label */}
          <nav className="flex-1 overflow-y-auto px-3 pb-3">
            {(sidebarOpen || isMobile) && (
              <p className="px-3 pt-2 pb-2 text-muted-foreground uppercase tracking-widest" style={{ fontSize: "0.65rem", fontWeight: 500 }}>
                Menu
              </p>
            )}
            {!sidebarOpen && !isMobile && (
              <div className="h-6" />
            )}

            {/* Main nav */}
            <div className="space-y-0.5">
              {mainNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === `/${user.role}`}
                    onClick={handleNavClick}
                    className={({ isActive }) => `group relative flex items-center ${sidebarOpen || isMobile ? "gap-3 px-6" : "justify-center px-0"} -mx-3 py-3 transition-all duration-200 ${isActive
                        ? "text-primary font-medium"
                        : "text-sidebar-foreground hover:text-foreground"
                      }`}
                  >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary" />
                      )}
                      <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                      {(sidebarOpen || isMobile) && (
                        <span className="truncate flex-1 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                          {item.label}
                          {item.badgeKey && navBadges[item.badgeKey] > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] leading-none">
                              {navBadges[item.badgeKey]}
                            </span>
                          )}
                        </span>
                      )}
                      {!sidebarOpen && !isMobile && item.badgeKey && navBadges[item.badgeKey] > 0 && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </>
                  )}
                  </NavLink>
                ))}

            </div>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center px-4 md:px-6 gap-3 shrink-0 pt-safe" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Button */}
          <div className="hidden md:flex items-center ml-2">
            <button className="flex items-center justify-between w-64 lg:w-96 px-4 py-2 rounded-xl bg-card/50 hover:bg-card text-muted-foreground border border-transparent transition-all duration-200">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4" />
                <span style={{ fontSize: "0.85rem" }}>Search...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-background text-muted-foreground border border-border" style={{ fontSize: "0.65rem" }}>⌘ F</kbd>
            </button>
          </div>

          <div className="flex-1" />

          {/* Student Check-in Button */}
          {user.role === "student" && (
            <button
              onClick={() => setCheckInModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${checkedInToday
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              style={{ fontSize: "0.85rem", fontWeight: 500 }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {checkedInToday ? "Checked In" : "Check In"}
            </button>
          )}

          {/* Notifications */}
          <NotificationBell />

          {/* User Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 md:gap-3 px-2 py-1.5 rounded-xl hover:bg-card transition-all duration-200 cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0"
                style={{ fontSize: "0.75rem", fontWeight: 600 }}
              >
                {(user.name || "U")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")}
              </div>
              <div className="hidden md:block text-left">
                <p style={{ fontSize: "0.85rem", fontWeight: 500 }} className="text-foreground">
                  {user.name || "User"}
                </p>
                <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">
                  {user.email || "—"}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground hidden md:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div
                  className="absolute right-0 top-14 w-72 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-2xl z-50 overflow-hidden"
                  style={{ boxShadow: "0 4px 24px rgba(11,94,215,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  {/* Profile Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0"
                        style={{ fontSize: "0.8rem", fontWeight: 600 }}
                      >
                        {(user.name || "U").split(" ").map((w) => w[0]).join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p style={{ fontSize: "0.9rem", fontWeight: 500 }} className="text-foreground truncate">
                          {user.name || "User"}
                        </p>
                        <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground truncate">
                          {user.email || "—"}
                        </p>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/8 text-primary mt-1"
                          style={{ fontSize: "0.65rem", fontWeight: 500 }}
                        >
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1.5">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate(`/${user.role}/settings`);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground hover:bg-card transition-colors duration-150 text-left"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Settings
                    </button>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        toggleTheme();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground hover:bg-card transition-colors duration-150 text-left"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {settings.darkMode ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                      {settings.darkMode ? "Light Mode" : "Dark Mode"}
                    </button>

                    <button
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-foreground hover:bg-card transition-colors duration-150 text-left"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      Help & Support
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-border py-1.5">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-destructive hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 text-left"
                      style={{ fontSize: "0.85rem" }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Check-in Modal */}
      {user.role === "student" && (
        <CheckInModal
          isOpen={checkInModalOpen}
          onClose={() => {
            setCheckInModalOpen(false);
            // Refresh check-in status after modal closes
            refreshCheckInStatus();
          }}
          onSuccess={refreshCheckInStatus}
          internshipId={activeInternship?.id}
          internshipStatus={activeInternship?.status}
        />
      )}
    </div>
  );
}
