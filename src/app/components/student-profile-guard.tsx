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

    const currentPath = window.location.pathname;

    // Allow profile-setup page always
    if (currentPath.includes("/student/profile-setup")) {
      return;
    }

    // Only redirect if profile is NOT marked complete
    if (!user.profileComplete) {
      navigate("/student/profile-setup", { replace: true });
    }
  }, [user?.role, user?.profileComplete, navigate]);

  return <>{children}</>;
}
