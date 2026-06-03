import { useState, useEffect } from "react";
import { Menu, Bell } from "lucide-react";
import { Outlet, useNavigate } from "react-router";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { CheckInModal } from "../check-in-modal";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { hasCheckedInToday, subscribeAttendance } from "../../services/attendance-service";

export function StudentMobileShell() {
  const { user, store } = useAppContext();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [activeInternship, setActiveInternship] = useState<any | null>(null);

  // Load active internship info for check-in modal
  useEffect(() => {
    apiClient.getInternships().then((res) => {
      if (res.success && res.data.length > 0) {
        const active = res.data.find((i: any) => i.status === "active" || i.status === "approved");
        setActiveInternship(active || res.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.studentId) return;
    const updateCheckInStatus = () => {
      setCheckedInToday(hasCheckedInToday(user.studentId || ""));
    };
    updateCheckInStatus();
    const unsubscribe = subscribeAttendance(updateCheckInStatus);
    return unsubscribe;
  }, [user?.studentId]);

  const handleLogout = async () => {
    await apiClient.logout();
    navigate("/login");
  };

  const notificationCount = (store.notifications ?? []).filter(
    (n: any) => !n.read
  ).length;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Header */}
      <header className="relative z-20 h-14 bg-background border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="font-bold text-lg flex-1">IAMS</span>

        {/* Check-in button */}
        <button
          onClick={() => setIsCheckInModalOpen(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            checkedInToday
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {checkedInToday ? "Checked In" : "Check In"}
        </button>

        {/* Notifications bell */}
        <button className="relative p-2 hover:bg-accent rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate("/student/profile-setup")}
          className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center hover:bg-primary/30 transition-colors"
        >
          {user?.name?.charAt(0).toUpperCase()}
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* Navigation drawer */}
      <MobileNavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      {/* Check-in modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        onSuccess={() => {
          setIsCheckInModalOpen(false);
          setCheckedInToday(hasCheckedInToday(user?.studentId || ""));
        }}
        internshipId={activeInternship?.id}
        internshipStatus={activeInternship?.status}
      />
    </div>
  );
}
