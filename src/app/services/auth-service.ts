import type { UserRole } from "../lib/mock-data";

export type ExtendedRole = UserRole | "student" | "supervisor" | "academic" | "hod";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: ExtendedRole;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  department?: string;
  department_id?: number;
  avatar?: string;
  studentId?: string;
  supervisorToken?: string;
  profileComplete?: boolean;
}

export function isHTUEmail(email: string): boolean {
  return email.endsWith("@htu.edu.gh") || email.endsWith("@st.htu.edu.gh");
}

const rolePermissions: Record<ExtendedRole, string[]> = {
  clo: [
    "view:all_departments",
    "manage:terms",
    "manage:templates",
    "manage:users",
    "approve:companies",
    "override:company_decisions",
    "approve:applications",
    "override:applications",
    "assign:supervisors",
    "override:supervisors",
    "approve:grades",
    "view:audit_logs",
    "manage:settings",
    "archive:terms",
    "export:reports",
    "send:announcements",
  ],
  dlo: [
    "view:own_department",
    "approve:companies",
    "approve:applications",
    "assign:supervisors",
    "approve:grades",
    "view:students",
    "send:dept_announcements",
    "export:dept_reports",
    "manage:dept_settings",
  ],
  student: [
    "apply:attachment",
    "submit:logbook",
    "upload:documents",
    "view:own_status",
    "view:own_logbook",
  ],
  supervisor: [
    "view:assigned_students",
    "submit:evaluation",
    "view:logbook",
  ],
  academic: [
    "view:assigned_students",
    "view:logbook",
    "submit:evaluation",
    "submit:grades",
  ],
  hod: [
    "view:own_department",
    "view:dept_reports",
    "view:dept_students",
  ],
};

export function hasPermission(role: ExtendedRole, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getRoutePrefix(role: ExtendedRole): string {
  switch (role) {
    case "clo": return "/clo";
    case "dlo": return "/workspace";
    case "student": return "/student";
    case "supervisor": return "/workspace";
    case "academic": return "/workspace";
    case "hod": return "/workspace";
    default: return "/";
  }
}

export function getAllowedRoutes(role: ExtendedRole): string[] {
  switch (role) {
    case "clo":
      return [
        "/clo",
        "/clo/applications",
        "/clo/companies",
        "/clo/terms",
        "/clo/users",
        "/clo/students",
        "/clo/grades",
        "/clo/reports",
        "/clo/attendance",
        "/clo/audit",
        "/clo/templates",
        "/clo/settings",
        "/clo/issues",
        "/clo/communications",
      ];
    case "dlo":
      return [
        "/workspace",
        "/dlo",
        "/dlo/applications",
        "/dlo/companies",
        "/dlo/students",
        "/dlo/supervisors",
        "/dlo/assignments",
        "/dlo/final-grading",
        "/dlo/grades",
        "/dlo/reports",
        "/dlo/attendance",
        "/dlo/settings",
        "/dlo/issues",
        "/dlo/communications",
      ];
    case "student":
      return [
        "/student",
        "/student/applications",
        "/student/logbook",
        "/student/documents",
        "/student/evaluation",
        "/student/grades",
        "/student/history",
        "/student/issues",
        "/student/communications",
      ];
    case "supervisor":
      return [
        "/workspace",
        "/supervisor",
        "/supervisor/evaluate",
        "/supervisor/logbooks",
        "/supervisor/attendance",
        "/supervisor/communications",
      ];
    case "academic":
      return [
        "/workspace",
        "/academic",
        "/academic/students",
        "/academic/evaluate",
        "/academic/grades",
        "/academic/visits",
        "/academic/attendance",
        "/academic/communications",
      ];
    case "hod":
      return [
        "/workspace",
        "/hod",
        "/hod/reports",
        "/hod/students",
        "/hod/approvals",
        "/hod/settings",
        "/hod/communications",
      ];
    default:
      return [];
  }
}
