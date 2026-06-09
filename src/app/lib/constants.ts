// Centralized constants and enums
// Eliminates magic strings across the codebase

// ── Role Constants ──
export const ROLES = {
  CLO: "clo",
  DLO: "dlo",
  STUDENT: "student",
  SUPERVISOR: "supervisor",
  ACADEMIC: "academic",
  HOD: "hod",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  clo: "Central Liaison Officer",
  dlo: "Departmental Liaison Officer",
  student: "Student",
  supervisor: "Industry Supervisor",
  academic: "Academic Supervisor",
  hod: "Head of Department",
};

// ── Application Status — real API values ──
export const APPLICATION_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];

// ── Company Approval Status — real API values ──
export const COMPANY_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type CompanyStatus = (typeof COMPANY_STATUS)[keyof typeof COMPANY_STATUS];

// ── Company Active Status — real API values ──
export const COMPANY_ACTIVE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

// ── Term Status — real API values ──
export const TERM_STATUS = {
  DRAFT: "draft",
  UPCOMING: "upcoming",
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export type TermStatus = (typeof TERM_STATUS)[keyof typeof TERM_STATUS];

// ── Logbook Status — real API values ──
export const LOGBOOK_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type LogbookApprovalStatus = (typeof LOGBOOK_STATUS)[keyof typeof LOGBOOK_STATUS];

// ── Grade Status ──
export const GRADE_STATUS = {
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
} as const;

export type GradeStatus = (typeof GRADE_STATUS)[keyof typeof GRADE_STATUS];

// ── Attendance ──
export const ATTENDANCE_CHECKIN_TYPE = {
  GPS: "gps",
  MANUAL: "manual",
} as const;

// Real API attendance status values
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  HALF_DAY: "half_day",
  EXCUSED: "excused",
} as const;

// Legacy alias kept for any code still referencing this name
export const ATTENDANCE_VERIFICATION_STATUS = ATTENDANCE_STATUS;

// ── Issue Status & Priority ──
export const ISSUE_STATUS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
} as const;

export const ISSUE_PRIORITY = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
} as const;

export const ISSUE_TYPES = {
  ACADEMIC: "academic",
  COMPANY: "company",
  LOGBOOK: "logbook",
  SUPERVISOR: "supervisor",
  OTHER: "other",
} as const;

// ── Notification Types ──
export const NOTIFICATION_TYPES = {
  APPLICATION: "application",
  COMPANY: "company",
  GRADE: "grade",
  ESCALATION: "escalation",
  SYSTEM: "system",
} as const;

// ── Departments ──
export const DEPARTMENTS = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Accounting & Finance",
] as const;

// ── Industrial Supervisor Assessment Criteria (18 criteria, 4 sections) ──
// Keys are the exact backend field names sent to POST /api/v1/assessments/industrial
import type { IndustrialCriterion, SectionWeights, StructureWeights, GradingStructure, WeeklyRubricCriterion, WeeklyRubric4PtRating, WeeklyRubric3PtRating } from "../types/grading";

export const INDUSTRIAL_CRITERIA: IndustrialCriterion[] = [
  // Section A — Technical Skills
  { key: "tech_understanding_concepts", section: "A", label: "Understanding of Concepts" },
  { key: "tech_application_knowledge",  section: "A", label: "Application of Knowledge" },
  { key: "tech_problem_solving",        section: "A", label: "Problem Solving" },
  { key: "tech_practical_skills",       section: "A", label: "Practical Skills" },
  { key: "tech_innovation",             section: "A", label: "Innovation & Creativity" },
  // Section B — Professional Skills
  { key: "prof_communication",   section: "B", label: "Communication" },
  { key: "prof_teamwork",        section: "B", label: "Teamwork" },
  { key: "prof_initiative",      section: "B", label: "Initiative" },
  { key: "prof_time_management", section: "B", label: "Time Management" },
  { key: "prof_adaptability",    section: "B", label: "Adaptability" },
  // Section C — Ethics & Conduct
  { key: "eth_punctuality",     section: "C", label: "Punctuality" },
  { key: "eth_reliability",     section: "C", label: "Reliability" },
  { key: "eth_responsibility",  section: "C", label: "Responsibility" },
  { key: "eth_professionalism", section: "C", label: "Professionalism" },
  // Section D — Overall Performance
  { key: "overall_quality",         section: "D", label: "Quality of Work" },
  { key: "overall_quantity",        section: "D", label: "Quantity of Work" },
  { key: "overall_improvement",     section: "D", label: "Improvement Over Time" },
  { key: "overall_recommendation",  section: "D", label: "Overall Recommendation" },
];

export const SECTION_LABELS: Record<"A" | "B" | "C" | "D", string> = {
  A: "Technical Skills",
  B: "Professional Skills",
  C: "Ethics & Conduct",
  D: "Overall Performance",
};

// ── Weekly Assessment Rubric (NOT scored) ──
// Filled once per week of the attachment by the Industrial Supervisor.
export const WEEKLY_RUBRIC_CRITERIA: WeeklyRubricCriterion[] = [
  { key: "WR1", label: "Attendance", scale: "4pt" },
  { key: "WR2", label: "Discipline", scale: "4pt" },
  { key: "WR3", label: "Punctuality", scale: "4pt" },
  { key: "WR4", label: "Ability to complete work on schedule", scale: "3pt" },
  { key: "WR5", label: "Ability to work under pressure", scale: "3pt" },
  { key: "WR6", label: "General Aptitude", scale: "3pt" },
];

export const WEEKLY_RUBRIC_4PT_OPTIONS: WeeklyRubric4PtRating[] = ["Poor", "Satisfactory", "Good", "Very Good"];
export const WEEKLY_RUBRIC_3PT_OPTIONS: WeeklyRubric3PtRating[] = ["Weak", "Average", "Above Average"];

export const RATING_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Weak",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Outstanding",
};

// Default config seeded for any department that hasn't configured yet (Q5).
// Structure C — Industrial 40 / Departmental 30 / Report 15 / Presentation 15.
export const DEFAULT_STRUCTURE: GradingStructure = "C";
export const DEFAULT_STRUCTURE_WEIGHTS: StructureWeights = { w1: 40, w2: 30, w3: 15, w4: 15 };
export const DEFAULT_SECTION_WEIGHTS: SectionWeights = { a: 25, b: 25, c: 25, d: 25 };

// ── Grading Config Status ──
export const GRADING_CONFIG_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  ACTIVE: "active",
} as const;

// ── API Endpoints (for backend team reference) ──
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/api/v1/auth/login",
  AUTH_LOGOUT: "/api/v1/auth/logout",
  AUTH_ME: "/api/v1/auth/me",
  AUTH_REFRESH: "/api/v1/auth/refresh",
  AUTH_GOOGLE: "/api/v1/auth/google",
  AUTH_GOOGLE_CALLBACK: "/api/v1/auth/google/callback",
  AUTH_MAGIC_LINK: "/api/v1/auth/magic-link",
  AUTH_MAGIC_LINK_VERIFY: "/api/v1/auth/magic-link/verify",

  // Applications
  APPLICATIONS: "/api/v1/applications",
  APPLICATIONS_PENDING: "/api/v1/applications/pending",
  APPLICATION_SUBMIT: "/api/v1/applications/:id/submit",
  APPLICATION_APPROVE: "/api/v1/applications/:id/approve",
  APPLICATION_REJECT: "/api/v1/applications/:id/reject",
  APPLICATION_BULK_APPROVE: "/api/v1/applications/bulk-approve",

  // Internships
  INTERNSHIPS: "/api/v1/internships",
  INTERNSHIP_ACTIVE: "/api/v1/internships/active",
  INTERNSHIP_OVERVIEW: "/api/v1/internships/:id/overview",
  INTERNSHIP_LOGBOOKS: "/api/v1/internships/:internshipId/logbooks",
  INTERNSHIP_ACTIVATE: "/api/v1/internships/:id/activate",
  INTERNSHIP_COMPLETE: "/api/v1/internships/:id/complete",
  INTERNSHIP_TERMINATE: "/api/v1/internships/:id/terminate",
  INTERNSHIP_ASSIGN_SUPERVISOR: "/api/v1/internships/:id/assign-supervisor",

  // Companies
  COMPANIES: "/api/v1/companies",
  COMPANIES_PENDING: "/api/v1/companies/pending",
  COMPANY_APPROVE: "/api/v1/companies/:id/approve",
  COMPANY_REJECT: "/api/v1/companies/:id/reject",
  COMPANY_DEACTIVATE: "/api/v1/companies/:id/deactivate",

  // Terms
  TERMS: "/api/v1/terms",
  TERM_ACTIVE: "/api/v1/terms/active",
  TERM_BY_ID: "/api/v1/terms/:id",
  TERM_PUBLISH: "/api/v1/terms/:id/publish",
  TERM_ARCHIVE: "/api/v1/terms/:id/archive",
  TERM_DASHBOARD: "/api/v1/terms/:id/dashboard",

  // Students
  STUDENTS: "/api/v1/students",
  STUDENT_BY_ID: "/api/v1/students/:id",

  // CLO users
  USERS: "/api/v1/users",
  USER_BY_ID: "/api/v1/users/:id",
  DLOS: "/api/v1/users/dlos",
  USERS_ACTIVATE: "/api/v1/users/:id/activate",
  USERS_DEACTIVATE: "/api/v1/users/:id/deactivate",
  USERS_IMPORTABLE: "/api/v1/users/staff/importable",

  // Departments
  DEPARTMENTS: "/api/v1/departments",
  DEPARTMENT_BY_ID: "/api/v1/departments/:id",

  // Logbook
  LOGBOOK_ENTRIES: "/api/v1/logbooks",
  LOGBOOK_SUBMIT: "/api/v1/logbooks/:id/submit",
  LOGBOOK_APPROVE: "/api/v1/logbooks/:id/approve",
  LOGBOOK_REVISION: "/api/v1/logbooks/:id/comment",

  // Attendance
  ATTENDANCE: "/api/v1/attendance",
  ATTENDANCE_MISSED: "/api/v1/attendance/missed",
  ATTENDANCE_CHECKIN: "/api/v1/attendance/check-in",
  ATTENDANCE_CHECKOUT: "/api/v1/attendance/:id/check-out",
  ATTENDANCE_VERIFY: "/api/v1/attendance/:id/verify",
  ATTENDANCE_BY_INTERNSHIP: "/api/v1/internships/:internshipId/attendance",

  // Supervisor assignments
  SUPERVISOR_ASSIGNMENTS_PENDING: "/api/v1/supervisor-assignments/pending",
  SUPERVISOR_ASSIGNMENTS_AVAILABLE: "/api/v1/supervisor-assignments/available-supervisors",
  SUPERVISOR_ASSIGNMENTS_AUTO: "/api/v1/supervisor-assignments/auto-assign",
  SUPERVISOR_STUDENTS: "/api/v1/supervisor-assignments/supervisors/:supervisorId/students",

  // Site visitations
  SITE_VISITATIONS: "/api/v1/site-visitations",
  SITE_VISITATION_COMPLETE: "/api/v1/site-visitations/:id/complete",
  SITE_VISITATION_CANCEL: "/api/v1/site-visitations/:id/cancel",
  SITE_VISITATION_SCORE: "/api/v1/site-visitations/:visitationId/score",
  SITE_VISITATION_SCORE_SUBMIT: "/api/v1/assessments/site-visitation/:id/submit",
  SITE_VISITATION_SCORE_APPROVE: "/api/v1/assessments/site-visitation/:id/approve",

  // Industrial assessments
  ASSESSMENTS_INDUSTRIAL: "/api/v1/assessments/industrial",
  ASSESSMENT_INDUSTRIAL_SUBMIT: "/api/v1/assessments/industrial/:id/submit",
  ASSESSMENT_INDUSTRIAL_APPROVE: "/api/v1/assessments/industrial/:id/approve",

  // Report scores
  ASSESSMENTS_REPORT: "/api/v1/assessments/report",
  ASSESSMENT_REPORT_APPROVE: "/api/v1/assessments/report/:id/approve",

  // Presentation scores
  ASSESSMENTS_PRESENTATION: "/api/v1/assessments/presentation",
  ASSESSMENT_PRESENTATION_GRADE: "/api/v1/assessments/presentation/:id/grade",
  ASSESSMENT_PRESENTATION_APPROVE: "/api/v1/assessments/presentation/:id/approve",

  // Grading configuration
  GRADING_CONFIG: "/api/v1/grading-config",
  GRADING_CONFIG_SET_DEFAULT: "/api/v1/grading-config/:id/set-default",

  // Final grades
  GRADES: "/api/v1/grades",
  GRADES_PENDING_APPROVAL: "/api/v1/grades/pending-approval",
  GRADES_EXPORT: "/api/v1/grades/export",
  GRADES_COMPILE: "/api/v1/grades/:internshipId/compile",
  GRADE_APPROVE: "/api/v1/grades/:id/approve",
  GRADE_REVISION: "/api/v1/grades/:id/revision",
  GRADES_PUBLISH: "/api/v1/grades/:id/publish",

  // Notifications
  NOTIFICATIONS: "/api/v1/notifications",
  NOTIFICATION_READ: "/api/v1/notifications/:id/read",
  NOTIFICATIONS_READ_ALL: "/api/v1/notifications/read-all",

  // Announcements (dedicated table)
  ANNOUNCEMENTS: "/api/v1/announcements",
  ANNOUNCEMENT_UNREAD_COUNT: "/api/v1/announcements/unread-count",
  ANNOUNCEMENT_READ: "/api/v1/announcements/:id/read",
  ANNOUNCEMENT_PIN: "/api/v1/announcements/:id/pin",
  ANNOUNCEMENT_DELETE: "/api/v1/announcements/:id",

  // Messages
  MESSAGE_CONTACTS: "/api/v1/messages/contacts",
  THREADS: "/api/v1/messages/threads",
  THREAD_MESSAGES: "/api/v1/messages/threads/:id",
  THREAD_SEND: "/api/v1/messages/threads/:id/send",
  THREAD_CREATE: "/api/v1/messages/threads",

  // Issues
  ISSUES: "/api/v1/issues",
  ISSUE_NOTE: "/api/v1/issues/:id/notes",
  ISSUE_STATUS: "/api/v1/issues/:id/status",
  ISSUE_ESCALATE: "/api/v1/issues/:id/escalate",

  // Reports
  REPORTS_PROGRESS: "/api/v1/reports/internship-progress",
  REPORTS_PERFORMANCE: "/api/v1/reports/student-performance",
  REPORTS_COMPANY: "/api/v1/reports/company-engagement",
  REPORTS_DEPT: "/api/v1/reports/department-statistics",
  REPORTS_EXPORT: "/api/v1/reports/export",
  REPORTS_CUSTOM: "/api/v1/reports/custom",

  // Audit & Settings
  AUDIT_LOGS: "/api/v1/audit-logs",
  SETTINGS: "/api/v1/settings",

  // Academic supervisors shorthand (filtered user list)
  ACADEMIC_SUPERVISORS: "/api/v1/users?role=academic_supervisor",

  // Role dashboards
  DASHBOARD_STUDENT: "/api/v1/dashboard/student",
  DASHBOARD_ACADEMIC: "/api/v1/dashboard/academic-supervisor",
  DASHBOARD_SUPERVISOR: "/api/v1/dashboard/industry-supervisor",
  DASHBOARD_DLO: "/api/v1/dashboard/dlo",
  DASHBOARD_CLO: "/api/v1/dashboard/clo",
  DASHBOARD_HOD: "/api/v1/dashboard/hod",

  // Analytics
  ANALYTICS_OVERVIEW: "/api/v1/analytics/overview",
  ANALYTICS_DEPARTMENT: "/api/v1/analytics/department/:id",
  ANALYTICS_TERM: "/api/v1/analytics/term/:id",
} as const;
