import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { lazy, Suspense } from "react";
import { DashboardLayout } from "./components/dashboard-layout";
import { GlobalError } from "./components/global-error";
import { AuthGuard } from "./components/auth-guard";
import { StudentProfileGuard } from "./components/student-profile-guard";
import { Loader2 } from "lucide-react";

// Loading Fallback
function PageLoader() {
  return (
    <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Auth (Not lazy as it's the entry point)
import { LoginPage } from "./pages/auth/login";
import { MagicLinkPage } from "./pages/auth/magic-link";
import { GoogleCallbackPage } from "./pages/auth/google-callback";

// CLO Pages
const CLODashboard = lazy(() => import("./pages/clo/dashboard").then(m => ({ default: m.CLODashboard })));
const TermsPage = lazy(() => import("./pages/clo/terms").then(m => ({ default: m.TermsPage })));
const AuditLogsPage = lazy(() => import("./pages/clo/audit").then(m => ({ default: m.AuditLogsPage })));
const DepartmentsPage = lazy(() => import("./pages/clo/departments").then(m => ({ default: m.DepartmentsPage })));
const Templates = lazy(() => import("./pages/templates").then(m => ({ default: m.Templates })));
const SettingsPage = lazy(() => import("./pages/settings").then(m => ({ default: m.SettingsPage })));

// DLO Pages
const DLODashboard = lazy(() => import("./pages/dlo/dashboard").then(m => ({ default: m.DLODashboard })));
const SupervisorsPage = lazy(() => import("./pages/dlo/supervisors").then(m => ({ default: m.SupervisorsPage })));
const DLOAssignmentsPage = lazy(() => import("./pages/dlo/assignments").then(m => ({ default: m.DLOAssignmentsPage })));
const DLOFinalGradingPage = lazy(() => import("./pages/dlo/final-grading").then(m => ({ default: m.DLOFinalGradingPage })));

// Shared Pages
const ApplicationsPage = lazy(() => import("./pages/shared/applications-page").then(m => ({ default: m.ApplicationsPage })));
const CompaniesPage = lazy(() => import("./pages/shared/companies-page").then(m => ({ default: m.CompaniesPage })));
const StudentsPage = lazy(() => import("./pages/shared/students-page").then(m => ({ default: m.StudentsPage })));
const GradesPage = lazy(() => import("./pages/shared/grades-page").then(m => ({ default: m.GradesPage })));
const ReportsPage = lazy(() => import("./pages/shared/reports-page").then(m => ({ default: m.ReportsPage })));
const CommunicationsPage = lazy(() => import("./pages/shared/communications-page").then(m => ({ default: m.CommunicationsPage })));
const IssuesPage = lazy(() => import("./pages/shared/issues-page").then(m => ({ default: m.IssuesPage })));
const AttendancePage = lazy(() => import("./pages/shared/attendance-page").then(m => ({ default: m.AttendancePage })));
const HelpPage = lazy(() => import("./pages/shared/help-page").then(m => ({ default: m.HelpPage })));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/student/dashboard").then(m => ({ default: m.StudentDashboard })));
const LogbookPage = lazy(() => import("./pages/student/logbook").then(m => ({ default: m.LogbookPage })));
const DocumentsPage = lazy(() => import("./pages/student/documents").then(m => ({ default: m.DocumentsPage })));
const StudentApplicationsPage = lazy(() => import("./pages/student/applications").then(m => ({ default: m.StudentApplicationsPage })));
const StudentGradesPage = lazy(() => import("./pages/student/grades").then(m => ({ default: m.StudentGradesPage })));
const StudentHistoryPage = lazy(() => import("./pages/student/history").then(m => ({ default: m.StudentHistoryPage })));
const StudentProfileSetup = lazy(() => import("./pages/student/profile-setup").then(m => ({ default: m.StudentProfileSetup })));
const StudentAttendancePage = lazy(() => import("./pages/student/attendance").then(m => ({ default: m.StudentAttendancePage })));

// Supervisor Pages
const SupervisorDashboard = lazy(() => import("./pages/supervisor/dashboard").then(m => ({ default: m.SupervisorDashboard })));
const EvaluatePage = lazy(() => import("./pages/supervisor/evaluate").then(m => ({ default: m.EvaluatePage })));
const SupervisorLogbooksPage = lazy(() => import("./pages/supervisor/logbooks").then(m => ({ default: m.SupervisorLogbooksPage })));
const SupervisorApprovalsPage = lazy(() => import("./pages/supervisor/approvals").then(m => ({ default: m.SupervisorApprovalsPage })));

// Academic & HOD Pages
const AcademicDashboard = lazy(() => import("./pages/academic/dashboard").then(m => ({ default: m.AcademicDashboard })));
const AcademicEvaluatePage = lazy(() => import("./pages/academic/evaluate").then(m => ({ default: m.AcademicEvaluatePage })));
const AcademicVisitsPage = lazy(() => import("./pages/academic/visits").then(m => ({ default: m.AcademicVisitsPage })));
const HODDashboard = lazy(() => import("./pages/hod/dashboard").then(m => ({ default: m.HODDashboard })));
const HODApprovalsPage = lazy(() => import("./pages/hod/approvals").then(m => ({ default: m.HODApprovalsPage })));

// Wrapper components for shared pages with role props
function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function CLOApplications() { return <SuspensePage><ApplicationsPage viewRole="clo" /></SuspensePage>; }
function CLOCompanies() { return <SuspensePage><CompaniesPage viewRole="clo" /></SuspensePage>; }
function CLOStudents() { return <SuspensePage><StudentsPage viewRole="clo" /></SuspensePage>; }
function CLOGrades() { return <SuspensePage><GradesPage viewRole="clo" /></SuspensePage>; }
function CLOReports() { return <SuspensePage><ReportsPage viewRole="clo" /></SuspensePage>; }
function CLOSettings() { return <SuspensePage><SettingsPage /></SuspensePage>; }
function CLOTemplates() { return <SuspensePage><Templates /></SuspensePage>; }
function CLOIssues() { return <SuspensePage><IssuesPage viewRole="clo" /></SuspensePage>; }
function CLOCommunications() { return <SuspensePage><CommunicationsPage viewRole="clo" /></SuspensePage>; }

function DLOApplications() { return <SuspensePage><ApplicationsPage viewRole="dlo" /></SuspensePage>; }
function DLOCompanies() { return <SuspensePage><CompaniesPage viewRole="dlo" /></SuspensePage>; }
function DLOStudents() { return <SuspensePage><StudentsPage viewRole="dlo" /></SuspensePage>; }
function DLOGrades() { return <SuspensePage><GradesPage viewRole="dlo" /></SuspensePage>; }
function DLOReports() { return <SuspensePage><ReportsPage viewRole="dlo" /></SuspensePage>; }
function DLOSettings() { return <SuspensePage><SettingsPage /></SuspensePage>; }
function DLOIssues() { return <SuspensePage><IssuesPage viewRole="dlo" /></SuspensePage>; }
function DLOCommunications() { return <SuspensePage><CommunicationsPage viewRole="dlo" /></SuspensePage>; }

function AcademicStudents() { return <SuspensePage><StudentsPage viewRole="academic" /></SuspensePage>; }
function AcademicAttendance() { return <SuspensePage><AttendancePage viewRole="academic" /></SuspensePage>; }
function AcademicCommunications() { return <SuspensePage><CommunicationsPage viewRole="academic" /></SuspensePage>; }

function StudentIssues() { return <SuspensePage><IssuesPage viewRole="student" /></SuspensePage>; }
function StudentCommunications() { return <SuspensePage><CommunicationsPage viewRole="student" /></SuspensePage>; }
function StudentSettings() { return <SuspensePage><SettingsPage /></SuspensePage>; }

function SupervisorAttendance() { return <SuspensePage><AttendancePage viewRole="supervisor" /></SuspensePage>; }
function SupervisorCommunications() { return <SuspensePage><CommunicationsPage viewRole="supervisor" /></SuspensePage>; }
function SupervisorSettings() { return <SuspensePage><SettingsPage /></SuspensePage>; }

function HODStudents() { return <SuspensePage><StudentsPage viewRole="hod" /></SuspensePage>; }
function HODReports() { return <SuspensePage><ReportsPage viewRole="hod" /></SuspensePage>; }
function HODCommunications() { return <SuspensePage><CommunicationsPage viewRole="hod" /></SuspensePage>; }
function HODSettings() { return <SuspensePage><SettingsPage /></SuspensePage>; }

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
          { index: true, element: <SuspensePage><CLODashboard /></SuspensePage> },
          { path: "applications", Component: CLOApplications },
          { path: "companies", Component: CLOCompanies },
          { path: "terms", element: <SuspensePage><TermsPage /></SuspensePage> },
          { path: "students", Component: CLOStudents },
          { path: "grades", Component: CLOGrades },
          { path: "reports", Component: CLOReports },
          { path: "attendance", element: <SuspensePage><AttendancePage viewRole="clo" /></SuspensePage> },
          { path: "audit", element: <SuspensePage><AuditLogsPage /></SuspensePage> },
          { path: "departments", element: <SuspensePage><DepartmentsPage /></SuspensePage> },
          { path: "templates", Component: CLOTemplates },
          { path: "settings", Component: CLOSettings },
          { path: "issues", Component: CLOIssues },
          { path: "communications", Component: CLOCommunications },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
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
          { index: true, element: <SuspensePage><DLODashboard /></SuspensePage> },
          { path: "applications", Component: DLOApplications },
          { path: "companies", Component: DLOCompanies },
          { path: "students", Component: DLOStudents },
          { path: "supervisors", element: <SuspensePage><SupervisorsPage /></SuspensePage> },
          { path: "assignments", element: <SuspensePage><DLOAssignmentsPage /></SuspensePage> },
          { path: "final-grading", element: <SuspensePage><DLOFinalGradingPage /></SuspensePage> },
          { path: "grades", Component: DLOGrades },
          { path: "reports", Component: DLOReports },
          { path: "attendance", element: <SuspensePage><AttendancePage viewRole="dlo" /></SuspensePage> },
          { path: "settings", Component: DLOSettings },
          { path: "issues", Component: DLOIssues },
          { path: "communications", Component: DLOCommunications },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
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
          { index: true, element: <SuspensePage><StudentDashboard /></SuspensePage> },
          { path: "profile-setup", element: <SuspensePage><StudentProfileSetup /></SuspensePage> },
          { path: "applications", element: <SuspensePage><StudentApplicationsPage /></SuspensePage> },
          { path: "logbook", element: <SuspensePage><LogbookPage /></SuspensePage> },
          { path: "attendance", element: <SuspensePage><StudentAttendancePage /></SuspensePage> },
          { path: "documents", element: <SuspensePage><DocumentsPage /></SuspensePage> },
          { path: "evaluation", element: <SuspensePage><StudentGradesPage /></SuspensePage> },
          { path: "grades", element: <Navigate to="/student/evaluation" replace /> },
          { path: "history", element: <SuspensePage><StudentHistoryPage /></SuspensePage> },
          { path: "issues", Component: StudentIssues },
          { path: "communications", Component: StudentCommunications },
          { path: "settings", Component: StudentSettings },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
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
          { index: true, element: <SuspensePage><SupervisorDashboard /></SuspensePage> },
          { path: "approvals", element: <SuspensePage><SupervisorApprovalsPage /></SuspensePage> },
          { path: "evaluate", element: <SuspensePage><EvaluatePage /></SuspensePage> },
          // Legacy deep-link → merged Assessments page (preserves any ?student= param).
          { path: "weekly-rubric", element: <Navigate to="/supervisor/evaluate?tab=weekly" replace /> },
          { path: "logbooks", element: <SuspensePage><SupervisorLogbooksPage /></SuspensePage> },
          { path: "attendance", Component: SupervisorAttendance },
          { path: "communications", Component: SupervisorCommunications },
          { path: "settings", Component: SupervisorSettings },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
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
          { index: true, element: <SuspensePage><AcademicDashboard /></SuspensePage> },
          { path: "students", Component: AcademicStudents },
          { path: "evaluate", element: <SuspensePage><AcademicEvaluatePage /></SuspensePage> },
          { path: "visits", element: <SuspensePage><AcademicVisitsPage /></SuspensePage> },
          { path: "attendance", element: <SuspensePage><AttendancePage viewRole="academic" /></SuspensePage> },
          { path: "grades", element: <SuspensePage><GradesPage viewRole="academic" /></SuspensePage> },
          { path: "communications", Component: AcademicCommunications },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
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
          { index: true, element: <SuspensePage><HODDashboard /></SuspensePage> },
          { path: "students", Component: HODStudents },
          { path: "reports", Component: HODReports },
          { path: "approvals", element: <SuspensePage><HODApprovalsPage /></SuspensePage> },
          { path: "communications", Component: HODCommunications },
          { path: "settings", Component: HODSettings },
          { path: "help", element: <SuspensePage><HelpPage /></SuspensePage> },
        ],
      },

      // Catch all
      { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);
