// Mock data for the Industrial Attachment Management System

import type {
  DepartmentGradingConfig,
  IndustrialSupervisorAssessment,
  SiteVisitationScore,
  ReportScore,
  PresentationScore,
  CompiledGrade,
  CriterionRating,
  WeeklyRubricEntry,
} from "../types/grading";
import {
  DEFAULT_STRUCTURE_WEIGHTS,
  DEFAULT_SECTION_WEIGHTS,
} from "./constants";

export type UserRole = "clo" | "dlo" | "academic" | "hod";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface Term {
  id: string;
  name: string;
  type: "Vacation" | "Semestrial";
  status: "Upcoming" | "Active" | "Completed" | "Archived";
  applicationStart: string;
  applicationEnd: string;
  internshipStart: string;
  internshipEnd: string;
  eligibleLevels: string[];
  departments: string[];
  // Empty array means "all programs across the selected departments".
  programs: string[];
}

export interface Company {
  branchCount: number;
  id: string;
  name: string;
  contactPerson: string;
  contactEmail: string;
  industry?: string;
  status: "Approved" | "Pending" | "Rejected";
  addedBy: string;
  dateAdded: string;
  rejectionReason?: string;
  // Legacy fields kept optional for back-compat with older views.
  // New flows source address/phone from Branch records.
  address?: string;
  contactPhone?: string;
  department?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  region: string;
  location: string;
  address: string;
  telephone: string;
  status: "Approved" | "Pending" | "Rejected";
  addedBy: string;
  dateAdded: string;
  rejectionReason?: string;
}

export interface Application {
  termId: any;
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  companyId: string;
  companyName: string;
  companyStatus: "Approved" | "Pending";
  branchId?: string;
  branchName?: string;
  status: "Pending" | "Approved" | "Rejected" | "Company Accepted" | "Active" | "Completed";
  dateApplied: string;
  supervisorAssigned?: string;
  grade?: string;
  gradeStatus?: "Pending" | "Submitted" | "Approved";
}

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  department: string;
  currentLoad: number;
  maxLoad: number;
}

export interface Notification {
  id: string;
  type: "application" | "company" | "grade" | "escalation" | "system";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

// Current user state
export const currentUser: User = {
  id: "u1",
  name: "Dr. Kwame Asante",
  email: "k.asante@htu.edu.gh",
  role: "clo",
  avatar: "",
};

export const ghanaRegions = [
  "Ahafo Region",
  "Ashanti Region",
  "Bono Region",
  "Bono East Region",
  "Central Region",
  "Eastern Region",
  "Greater Accra Region",
  "North East Region",
  "Northern Region",
  "Oti Region",
  "Savannah Region",
  "Upper East Region",
  "Upper West Region",
  "Volta Region",
  "Western Region",
  "Western North Region",
];

export const departments = [
  "Computer Science",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Accounting & Finance",
];

// Programs grouped by department. In production these would be fetched from
// the student records API rather than hard-coded.
export const programsByDepartment: Record<string, string[]> = {
  "Computer Science": [
    "BSc Computer Science",
    "BTech Information Technology",
    "BSc Software Engineering",
    "HND Computer Science",
  ],
  "Electrical Engineering": [
    "BEng Electrical & Electronic Engineering",
    "BTech Electrical Engineering",
    "HND Electrical Engineering",
  ],
  "Mechanical Engineering": [
    "BEng Mechanical Engineering",
    "BTech Mechanical Engineering",
    "HND Mechanical Engineering",
    "HND Automotive Engineering",
  ],
  "Civil Engineering": [
    "BEng Civil Engineering",
    "BTech Civil Engineering",
    "HND Building Technology",
    "HND Civil Engineering",
  ],
  "Business Administration": [
    "BBA Business Administration",
    "BBA Marketing",
    "BBA Human Resource Management",
    "HND Marketing",
  ],
  "Accounting & Finance": [
    "BSc Accounting",
    "BSc Banking & Finance",
    "HND Accountancy",
  ],
};

// Flat list of all programs across departments (convenience for selectors).
export const programs: string[] = Object.values(programsByDepartment).flat();

export const terms: Term[] = [];

export const companies: Company[] = [];

// One "Main Branch" auto-seeded per company so existing applications can link.
// Additional branches added below for a couple companies to exercise the multi-branch UX.
export const branches: Branch[] = [];

export const applications: Application[] = [];

export const supervisors: Supervisor[] = [];

export const notifications: Notification[] = [];

export const auditLogs: AuditLog[] = [];

export const staffList = [];

// ── Grading: per-department configurations seeded for active term (t1) ──
// Mix of statuses so HOD has something pending, others already locked.
const TERM_ID = "t1";
const seedTimestamp = "2026-03-01T09:00:00";

function ratings(values: number[]): Record<string, CriterionRating> {
  // 20 criteria — A1-A4 (4), B1-B8 (8), C1-C5 (5), D1-D3 (3).
  // Older 18-value seed arrays are auto-padded for B7/B8 with a default 3.
  const keys = [
    "A1", "A2", "A3", "A4",
    "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8",
    "C1", "C2", "C3", "C4", "C5",
    "D1", "D2", "D3",
  ];
  const out: Record<string, CriterionRating> = {} as any;
  // If the caller passed the legacy 18-length array (pre-B7/B8), splice in defaults.
  let v = values;
  if (values.length === 18) {
    v = [
      ...values.slice(0, 10),  // A1-A4 + B1-B6
      3, 3,                     // B7, B8 (default Average)
      ...values.slice(10),      // C1-C5 + D1-D3
    ];
  }
  keys.forEach((k, i) => { out[k] = (v[i] ?? 3) as CriterionRating; });
  return out;
}

export const departmentGradingConfigs: DepartmentGradingConfig[] = [];

export const industrialAssessments: IndustrialSupervisorAssessment[] = [];

export const siteVisitations: SiteVisitationScore[] = [];

export const reportScores: ReportScore[] = [];

export const presentationScores: PresentationScore[] = [];

export const compiledGrades: CompiledGrade[] = [];

export const weeklyRubrics: WeeklyRubricEntry[] = [];

export const studentActivity: { studentName: string; lastLogDate: string; daysSinceLog: number; status: "green" | "yellow" | "red" }[] = [];
