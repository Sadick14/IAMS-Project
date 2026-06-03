import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { DashboardLayout } from "./components/dashboard-layout";
import { GlobalError } from "./components/global-error";
import { AuthGuard } from "./components/auth-guard";
import { StudentProfileGuard } from "./components/student-profile-guard";

// Auth
import { LoginPage } from "./pages/auth/login";
import { MagicLinkPage } from "./pages/auth/magic-link";
import { GoogleCallbackPage } from "./pages/auth/google-callback";

// CLO Pages
import { CLODashboard } from "./pages/clo/dashboard";
import { TermsPage } from "./pages/clo/terms";
import { UsersPage } from "./pages/clo/users";
import { AuditLogsPage } from "./pages/clo/audit";
import { DepartmentsPage } from "./pages/clo/departments";
import { Templates } from "./pages/templates";
import { SettingsPage } from "./pages/settings";

// DLO Pages
import { DLODashboard } from "./pages/dlo/dashboard";
import { SupervisorsPage } from "./pages/dlo/supervisors";
import { DLOAssignmentsPage } from "./pages/dlo/assignments";
import { DLOFinalGradingPage } from "./pages/dlo/final-grading";

// Academic Site Visitation

// Shared Pages
import { ApplicationsPage } from "./pages/shared/applications-page";
import { CompaniesPage } from "./pages/shared/companies-page";
import { StudentsPage } from "./pages/shared/students-page";
import { GradesPage } from "./pages/shared/grades-page";
import { ReportsPage } from "./pages/shared/reports-page";
import { CommunicationsPage } from "./pages/shared/communications-page";
import { IssuesPage } from "./pages/shared/issues-page";
import { AttendancePage } from "./pages/shared/attendance-page";

// Student Pages
import { StudentDashboard } from "./pages/student/dashboard";
import { LogbookPage } from "./pages/student/logbook";
import { DocumentsPage } from "./pages/student/documents";
import { StudentApplicationsPage } from "./pages/student/applications";
import { StudentGradesPage } from "./pages/student/grades";
import { StudentHistoryPage } from "./pages/student/history";
import { StudentProfileSetup } from "./pages/student/profile-setup";
import { StudentAttendancePage } from "./pages/student/attendance";

// Supervisor Pages
import { SupervisorDashboard } from "./pages/supervisor/dashboard";
import { EvaluatePage } from "./pages/supervisor/evaluate";
import { SupervisorLogbooksPage } from "./pages/supervisor/logbooks";

// Academic & HOD Pages
import { AcademicDashboard } from "./pages/academic/dashboard";
import { AcademicEvaluatePage } from "./pages/academic/evaluate";
import { AcademicVisitsPage } from "./pages/academic/visits";
import { HODDashboard } from "./pages/hod/dashboard";
import { HODApprovalsPage } from "./pages/hod/approvals";

// Wrapper components for shared pages with role props
function CLOApplications() { return <ApplicationsPage viewRole="clo" />; }
function CLOCompanies() { return <CompaniesPage viewRole="clo" />; }
function CLOStudents() { return <StudentsPage viewRole="clo" />; }
function CLOGrades() { return <GradesPage viewRole="clo" />; }
function CLOReports() { return <ReportsPage viewRole="clo" />; }
function CLOSettings() { return <SettingsPage />; }
function CLOTemplates() { return <Templates />; }
function CLOIssues() { return <IssuesPage viewRole="clo" />; }
function CLOCommunications() { return <CommunicationsPage viewRole="clo" />; }

function DLOApplications() { return <ApplicationsPage viewRole="dlo" />; }
function DLOCompanies() { return <CompaniesPage viewRole="dlo" />; }
function DLOStudents() { return <StudentsPage viewRole="dlo" />; }
function DLOGrades() { return <GradesPage viewRole="dlo" />; }
function DLOReports() { return <ReportsPage viewRole="dlo" />; }
function DLOSettings() { return <SettingsPage />; }
function DLOIssues() { return <IssuesPage viewRole="dlo" />; }
function DLOCommunications() { return <CommunicationsPage viewRole="dlo" />; }

function AcademicStudents() { return <StudentsPage viewRole="academic" />; }
function AcademicAttendance() { return <AttendancePage viewRole="academic" />; }
function AcademicCommunications() { return <CommunicationsPage viewRole="academic" />; }

function StudentIssues() { return <IssuesPage viewRole="student" />; }
function StudentCommunications() { return <CommunicationsPage viewRole="student" />; }
function StudentSettings() { return <SettingsPage />; }

function SupervisorAttendance() { return <AttendancePage viewRole="supervisor" />; }
function SupervisorCommunications() { return <CommunicationsPage viewRole="supervisor" />; }
function SupervisorSettings() { return <SettingsPage />; }

function HODStudents() { return <StudentsPage viewRole="hod" />; }
function HODReports() { return <ReportsPage viewRole="hod" />; }
function HODCommunications() { return <CommunicationsPage viewRole="hod" />; }
function HODSettings() { return <SettingsPage />; }

// Auth guard wrappers
function CLOGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["clo"]}>{children}</AuthGuard>;
}
function DLOGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["dlo"]}>{children}</AuthGuard>;
}
function StudentGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["student"]}>{children}</AuthGuard>;
}
function SupervisorGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["supervisor"]}>{children}</AuthGuard>;
}
function AcademicGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["academic"]}>{children}</AuthGuard>;
}
function HODGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["hod"]}>{children}</AuthGuard>;
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <GlobalError />,
    children: [
      // Auth routes
      { path: "/login", element: <LoginPage /> },
      { path: "/auth/magic-link", element: <MagicLinkPage /> },
      { path: "/auth/google/callback", element: <GoogleCallbackPage /> },

      // Root redirect
      { path: "/", element: <Navigate to="/login" replace /> },

      // CLO Portal
      {
        path: "/clo",
        element: (
          <CLOGuard>
            <DashboardLayout />
          </CLOGuard>
        ),
        children: [
          { index: true, element: <CLODashboard /> },
          { path: "applications", Component: CLOApplications },
          { path: "companies", Component: CLOCompanies },
          { path: "terms", element: <TermsPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "students", Component: CLOStudents },
          { path: "grades", Component: CLOGrades },
          { path: "reports", Component: CLOReports },
          { path: "attendance", element: <AttendancePage viewRole="clo" /> },
          { path: "audit", element: <AuditLogsPage /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "templates", Component: CLOTemplates },
          { path: "settings", Component: CLOSettings },
          { path: "issues", Component: CLOIssues },
          { path: "communications", Component: CLOCommunications },
        ],
      },

      // DLO Portal
      {
        path: "/dlo",
        element: (
          <DLOGuard>
            <DashboardLayout />
          </DLOGuard>
        ),
        children: [
          { index: true, element: <DLODashboard /> },
          { path: "applications", Component: DLOApplications },
          { path: "companies", Component: DLOCompanies },
          { path: "students", Component: DLOStudents },
          { path: "supervisors", element: <SupervisorsPage /> },
          { path: "assignments", element: <DLOAssignmentsPage /> },
          { path: "final-grading", element: <DLOFinalGradingPage /> },
          { path: "grades", Component: DLOGrades },
          { path: "reports", Component: DLOReports },
          { path: "attendance", element: <AttendancePage viewRole="dlo" /> },
          { path: "settings", Component: DLOSettings },
          { path: "issues", Component: DLOIssues },
          { path: "communications", Component: DLOCommunications },
        ],
      },

      // Student Portal
      {
        path: "/student",
        element: (
          <StudentGuard>
            <StudentProfileGuard>
              <DashboardLayout />
            </StudentProfileGuard>
          </StudentGuard>
        ),
        children: [
          { index: true, element: <StudentDashboard /> },
          { path: "profile-setup", element: <StudentProfileSetup /> },
          { path: "applications", element: <StudentApplicationsPage /> },
          { path: "logbook", element: <LogbookPage /> },
          { path: "attendance", element: <StudentAttendancePage /> },
          { path: "documents", element: <DocumentsPage /> },
          { path: "evaluation", element: <StudentGradesPage /> },
          { path: "grades", element: <Navigate to="/student/evaluation" replace /> },
          { path: "history", element: <StudentHistoryPage /> },
          { path: "issues", Component: StudentIssues },
          { path: "communications", Component: StudentCommunications },
          { path: "settings", Component: StudentSettings },
        ],
      },

      // External Supervisor Portal
      {
        path: "/supervisor",
        element: (
          <SupervisorGuard>
            <DashboardLayout />
          </SupervisorGuard>
        ),
        children: [
          { index: true, element: <SupervisorDashboard /> },
          { path: "evaluate", element: <EvaluatePage /> },
          // Legacy deep-link → merged Assessments page (preserves any ?student= param).
          { path: "weekly-rubric", element: <Navigate to="/supervisor/evaluate?tab=weekly" replace /> },
          { path: "logbooks", element: <SupervisorLogbooksPage /> },
          { path: "attendance", Component: SupervisorAttendance },
          { path: "communications", Component: SupervisorCommunications },
          { path: "settings", Component: SupervisorSettings },
        ],
      },

      // Academic Portal
      {
        path: "/academic",
        element: (
          <AcademicGuard>
            <DashboardLayout />
          </AcademicGuard>
        ),
        children: [
          { index: true, element: <AcademicDashboard /> },
          { path: "students", Component: AcademicStudents },
          { path: "evaluate", element: <AcademicEvaluatePage /> },
          { path: "visits", element: <AcademicVisitsPage /> },
          { path: "attendance", element: <AttendancePage viewRole="academic" /> },
          { path: "grades", element: <GradesPage viewRole="academic" /> },
          { path: "communications", Component: AcademicCommunications },
        ],
      },

      // HOD Portal
      {
        path: "/hod",
        element: (
          <HODGuard>
            <DashboardLayout />
          </HODGuard>
        ),
        children: [
          { index: true, element: <HODDashboard /> },
          { path: "students", Component: HODStudents },
          { path: "reports", Component: HODReports },
          { path: "approvals", element: <HODApprovalsPage /> },
          { path: "communications", Component: HODCommunications },
          { path: "settings", Component: HODSettings },
        ],
      },

      // Catch all
      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);
