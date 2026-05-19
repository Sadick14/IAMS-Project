// Grading domain types — Industrial Attachment Management System
// Aligned with assessment-score-flow.md

export type GradingStructure = "A" | "B" | "C" | "D";

export type GradingConfigStatus = "draft" | "pending_approval" | "active";

// 1–5 scale per criterion (1=Weak, 5=Outstanding)
export type CriterionRating = 1 | 2 | 3 | 4 | 5;

// Section weights — must sum to 100
export interface SectionWeights {
  a: number; // Specific Skills (4 criteria)
  b: number; // General Employability Skills (6 criteria)
  c: number; // Attitude to Work (5 criteria)
  d: number; // Human Relations (3 criteria)
}

// Structure weights — must sum to 100.
// A: w1+w2+w3(Report)        | w4 unused
// B: w1+w2+w3(Presentation)   | w4 unused
// C: w1+w2+w3(Report)+w4(Presentation), all ≥ 1
// D: w1+w2+w3(Report)+w4(Presentation), w1/w2 ≥ 1, w3/w4 may be 0
export interface StructureWeights {
  w1: number; // Industrial Supervisor
  w2: number; // Departmental Supervisor (Site Visitation)
  w3: number; // Report (A/C/D) or Presentation (B)
  w4?: number; // Presentation (C/D)
}

// Per-department, per-term grading configuration.
// Locked once HOD approves; immutable for the rest of the term.
export interface DepartmentGradingConfig {
  id: string;
  departmentId: string; // department name (used as id in mock data)
  termId: string;
  structure: GradingStructure;
  structureWeights: StructureWeights;
  sectionWeights: SectionWeights; // Industrial Supervisor section weighting (Q1)
  status: GradingConfigStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  submittedForApprovalBy?: string;
  submittedForApprovalAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedAt?: string;
}

// 20 Industrial Supervisor criteria — keys map 1:1 to assessment-score-flow.md
export type CriterionKey =
  | "A1" | "A2" | "A3" | "A4"
  | "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7" | "B8"
  | "C1" | "C2" | "C3" | "C4" | "C5"
  | "D1" | "D2" | "D3";

export type CriterionSection = "A" | "B" | "C" | "D";

export interface IndustrialCriterion {
  key: CriterionKey;
  section: CriterionSection;
  label: string;
}

export interface IndustrialSupervisorAssessment {
  id: string;
  applicationId: string;
  ratings: Record<CriterionKey, CriterionRating>;
  comments: string;
  submittedBy: string;
  submittedAt: string;
}

export type VisitationCriterionRating = 0 | 1 | 2 | 3;
export type VisitationCriterionKey = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7" | "V8" | "V9" | "V10";

export const VISITATION_CRITERIA: { key: VisitationCriterionKey; label: string }[] = [
  { key: "V1", label: "Punctuality and Attendance" },
  { key: "V2", label: "General Appearance and Deportment" },
  { key: "V3", label: "Interest and Commitment to Work" },
  { key: "V4", label: "Ability to Work with Others" },
  { key: "V5", label: "Ability to Follow Instructions" },
  { key: "V6", label: "Quality of Work Produced" },
  { key: "V7", label: "Application of Knowledge" },
  { key: "V8", label: "Use of Equipment/Tools" },
  { key: "V9", label: "Safety Consciousness" },
  { key: "V10", label: "Logbook Maintenance" },
];

export interface SiteVisitationScore {
  studentId: string | undefined;
  id: string;
  applicationId: string;
  ratings: Record<VisitationCriterionKey, VisitationCriterionRating>;
  score: number; // 0–30 or scaled to 100
  comments: string;
  visitedAt: string;
  submittedBy: string;
  overriddenBy?: string; // DLO override info
  overrideComments?: string;
}

export interface ReportScore {
  id: string;
  applicationId: string;
  score: number; // 0–100
  comments: string;
  submittedBy: string;
  submittedAt: string;
}

export interface PresentationScore {
  id: string;
  applicationId: string;
  score: number; // 0–100
  comments: string;
  submittedBy: string;
  submittedAt: string;
}

export type CompiledGradeStatus = "Pending" | "Submitted" | "Approved";

export interface CompiledGradeComponents {
  industrial?: number; // /100 (section-weighted)
  departmental?: number; // /100
  report?: number; // /100
  presentation?: number; // /100
}

export interface CompiledGrade {
  applicationId: string;
  components: CompiledGradeComponents;
  // Snapshot of the config in effect when this grade was compiled.
  // Frozen for the term per Q6 — never recalculated against newer configs.
  configSnapshot: DepartmentGradingConfig;
  finalPercent: number | null; // null until all required components present
  // Set when compilation is blocked by missing configuration (no DLO-approved
  // grading config exists for the department/term). Cleared once compiled.
  blockedReason?: string;
  status: CompiledGradeStatus;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ── Weekly Assessment Rubric (NOT scored — qualitative progress record) ──
// 6 criteria filled by Industrial Supervisor for each week of the term.
// Number of weeks is auto-derived from the term's internshipStart / internshipEnd.

export type WeeklyRubric4PtRating = "Poor" | "Satisfactory" | "Good" | "Very Good";
export type WeeklyRubric3PtRating = "Weak" | "Average" | "Above Average";

export type WeeklyRubricKey =
  | "WR1" // Attendance (4-pt)
  | "WR2" // Discipline (4-pt)
  | "WR3" // Punctuality (4-pt)
  | "WR4" // Ability to complete work on schedule (3-pt)
  | "WR5" // Ability to work under pressure (3-pt)
  | "WR6"; // General Aptitude (3-pt)

export interface WeeklyRubricCriterion {
  key: WeeklyRubricKey;
  label: string;
  scale: "4pt" | "3pt";
}

export interface WeeklyRubricRatings {
  WR1?: WeeklyRubric4PtRating;
  WR2?: WeeklyRubric4PtRating;
  WR3?: WeeklyRubric4PtRating;
  WR4?: WeeklyRubric3PtRating;
  WR5?: WeeklyRubric3PtRating;
  WR6?: WeeklyRubric3PtRating;
}

export interface WeeklyRubricEntry {
  id: string;
  applicationId: string;
  termId: string;
  weekNumber: number;     // 1-based
  weekStart: string;      // ISO date (Monday of that week)
  weekEnd: string;        // ISO date (Sunday of that week)
  ratings: WeeklyRubricRatings;
  notes: string;
  submittedBy: string;
  submittedAt: string;
}

// Actor passed to service functions for authorization checks.
export interface GradingActor {
  id: string;
  name: string;
  role: "clo" | "dlo" | "hod" | "academic" | "supervisor" | "student";
  department?: string;
}
