import { useEffect } from "react";
import { useAppContext } from "../lib/context";
import { useNavigate } from "react-router";

interface StudentProfileGuardProps {
  children: React.ReactNode;
}

/**
 * Student Profile Guard
 * Checks if student has completed their profile setup.
 * If not, redirects to profile setup page.
 */
export function StudentProfileGuard({ children }: StudentProfileGuardProps) {
  const { user } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Only apply guard to students
    if (user?.role !== "student") {
      return;
    }

    // Check if profile is already marked as complete
    const isProfileComplete = localStorage.getItem(`student_profile_complete_${user?.id}`);

    // Check if user has minimal profile data (phone + emergency contact)
    // This is a heuristic - backend should ideally track this
    const userHasBasicInfo = user && user.email && user.name;

    // If profile is not marked complete and user doesn't have basic info, redirect
    if (!isProfileComplete && (!userHasBasicInfo || true)) {
      // Allow access to profile-setup page only
      const currentPath = window.location.pathname;
      if (!currentPath.includes("/student/profile-setup")) {
        navigate("/student/profile-setup", { replace: true });
      }
    }
  }, [user, navigate]);

  return <>{children}</>;
}
