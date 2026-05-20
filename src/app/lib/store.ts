// Centralized mutable state store for the application
// All mutations go through service functions — never directly in components

import type { Application, Company, Branch, Notification, AuditLog, Term } from "./mock-data";
import {
  applications as initialApps,
  companies as initialCompanies,
  branches as initialBranches,
  notifications as initialNotifications,
  auditLogs as initialAuditLogs,
  terms as initialTerms,
  supervisors as initialSupervisors,
  studentActivity as initialStudentActivity,
  departmentGradingConfigs as initialConfigs,
  industrialAssessments as initialIndustrial,
  siteVisitations as initialVisits,
  reportScores as initialReports,
  presentationScores as initialPresentations,
  compiledGrades as initialCompiled,
  weeklyRubrics as initialWeeklyRubrics,
} from "./mock-data";
import type {
  DepartmentGradingConfig,
  IndustrialSupervisorAssessment,
  SiteVisitationScore,
  ReportScore,
  PresentationScore,
  CompiledGrade,
  WeeklyRubricEntry,
} from "../types/grading";

export interface LogbookEntry {
  id: string;
  studentId: string;
  date: string;
  activities: string;
  skills: string;
  challenges: string;
  supervisorComment?: string;
  approvalStatus: "Pending" | "Approved" | "Revision Requested";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface StoreState {
  applications: Application[];
  companies: Company[];
  branches: Branch[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  terms: Term[];
  logbookEntries: LogbookEntry[];
  gradingConfigs: DepartmentGradingConfig[];
  industrialAssessments: IndustrialSupervisorAssessment[];
  siteVisitations: SiteVisitationScore[];
  reportScores: ReportScore[];
  presentationScores: PresentationScore[];
  compiledGrades: CompiledGrade[];
  weeklyRubrics: WeeklyRubricEntry[];
  assignmentLocks: string[];
}

// Initialize logbook entries with mock data
const mockLogbookEntries: LogbookEntry[] = [];

const STORAGE_KEY = "iams_demo_store_state_v2";

function getInitialState(): StoreState {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load local store state:", e);
    }
  }
  return {
    applications: [],
    companies: [...initialCompanies], // Kept to avoid tedious data entry for companies
    branches: [...initialBranches],
    notifications: [],
    auditLogs: [],
    terms: [], // Empty so CLO can create one
    logbookEntries: [],
    gradingConfigs: [...initialConfigs], // Kept to maintain department grading structures
    industrialAssessments: [],
    siteVisitations: [],
    reportScores: [],
    presentationScores: [],
    compiledGrades: [],
    weeklyRubrics: [],
    assignmentLocks: [],
  };
}

// Global mutable store
let state: StoreState = getInitialState();

export function upsertWeeklyRubric(entry: WeeklyRubricEntry) {
  const exists = state.weeklyRubrics.some(
    (x) => x.applicationId === entry.applicationId && x.weekNumber === entry.weekNumber
  );
  state = {
    ...state,
    weeklyRubrics: exists
      ? state.weeklyRubrics.map((x) =>
        x.applicationId === entry.applicationId && x.weekNumber === entry.weekNumber ? entry : x
      )
      : [...state.weeklyRubrics, entry],
  };
  notify();
}

export function setAssignmentLock(applicationId: string, locked: boolean) {
  const has = state.assignmentLocks.includes(applicationId);
  if (locked && !has) {
    state = { ...state, assignmentLocks: [...state.assignmentLocks, applicationId] };
    notify();
  } else if (!locked && has) {
    state = { ...state, assignmentLocks: state.assignmentLocks.filter((id) => id !== applicationId) };
    notify();
  }
}

// Listeners for reactivity
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save local store state:", e);
    }
  }
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

// Helpers for student-specific queries and demo seeding
export function getLatestApplicationForStudent(studentId: string) {
  return [...state.applications].reverse().find((a) => a.studentId === studentId);
}

export function getStudentApplicationHistory(studentId: string) {
  return state.applications
    .filter((a) => a.studentId === studentId)
    .slice()
    .sort((x, y) => (x.dateApplied || "") < (y.dateApplied || "") ? -1 : 1);
}

export function ensureDemoStudentApplication(studentId: string) {
  const exists = state.applications.some((a) => a.studentId === studentId);
  if (!exists) simulateStudentStage("pending", studentId);
}

export function simulateStudentStage(stage: "fresh" | "pending" | "active" | "completed", studentId: string) {
  const prevAppIds = state.applications.filter(a => a.studentId === studentId).map(a => a.id);

  if (stage === "fresh") {
    const filteredApps = state.applications.filter(a => a.studentId !== studentId);
    const filteredLogs = state.logbookEntries.filter(l => l.studentId !== studentId);
    const filteredVisits = state.siteVisitations.filter(v => !prevAppIds.includes(v.applicationId));
    const filteredAssessments = state.industrialAssessments.filter(x => !prevAppIds.includes(x.applicationId));
    const filteredReports = state.reportScores.filter(r => !prevAppIds.includes(r.applicationId));
    const filteredCompiled = state.compiledGrades.filter(g => !prevAppIds.includes(g.applicationId));

    state = {
      ...state,
      applications: filteredApps,
      logbookEntries: filteredLogs,
      siteVisitations: filteredVisits,
      industrialAssessments: filteredAssessments,
      reportScores: filteredReports,
      compiledGrades: filteredCompiled,
    };
    notify();
    return;
  }

  // create a unique application id so prior internships are preserved
  const appId = `a-demo-${studentId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}-${Date.now()}`;
  const dateApplied = new Date().toISOString().split("T")[0];

  if (stage === "pending") {
    const newApp: Application = {
      id: appId,
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Pending",
      dateApplied,
      termId: undefined
    };
    state = { ...state, applications: [...state.applications, newApp] };
    notify();
    return;
  }

  if (stage === "active") {
    const newApp: Application = {
      id: appId,
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Active",
      dateApplied,
      supervisorAssigned: "Dr. Abena Osei",
      termId: undefined
    };
    // currently we don't seed detailed logbook rows here — keep it simple
    state = {
      ...state,
      applications: [...state.applications, newApp],
    };
    notify();
    return;
  }

  if (stage === "completed") {
    const newApp: Application = {
      id: appId,
      studentName: "John Doe",
      studentId: studentId,
      department: "Computer Science",
      level: "L300",
      companyId: "c1",
      companyName: "Ghana Telecom Ltd",
      companyStatus: "Approved",
      branchId: "b-c1-main",
      branchName: "Head Office",
      status: "Completed",
      dateApplied,
      supervisorAssigned: "Dr. Abena Osei",
      grade: "A",
      gradeStatus: "Submitted",
      termId: undefined
    };

    const mockAssessment: IndustrialSupervisorAssessment = {
      id: `ind-${appId}`,
      applicationId: appId,
      ratings: {
        A1: 5, A2: 5, A3: 4, A4: 5,
        B1: 5, B2: 5, B3: 4, B4: 5, B5: 4, B6: 5, B7: 5, B8: 5,
        C1: 5, C2: 5, C3: 4, C4: 4, C5: 5,
        D1: 5, D2: 5, D3: 4
      },
      comments: "John is outstanding! Incredible coding speed and technical knowledge.",
      submittedBy: "Mr. Mensah",
      submittedAt: new Date().toISOString()
    };

    const mockVisit: SiteVisitationScore = {
      id: `sv-${appId}`,
      applicationId: appId,
      score: 28,
      comments: "Highly disciplined and well-integrated into the local branch office.",
      visitedAt: new Date().toISOString(),
      submittedBy: "Dr. Abena Osei",
      ratings: { V1: 3, V2: 3, V3: 3, V4: 3, V5: 3, V6: 3, V7: 3, V8: 2, V9: 3, V10: 2 },
      studentId: studentId
    };

    const mockReport: ReportScore = {
      id: `rep-${appId}`,
      applicationId: appId,
      score: 92,
      comments: "Thorough internship report. Clear software architecture diagrams.",
      submittedBy: "Dr. Abena Osei",
      submittedAt: new Date().toISOString()
    };

    const mockCompiled: CompiledGrade = {
      applicationId: appId,
      components: { industrial: 94, departmental: 93, report: 92, presentation: 90 },
      configSnapshot: state.gradingConfigs[0],
      finalPercent: 93,
      status: "Approved",
      updatedAt: new Date().toISOString()
    };

    state = {
      ...state,
      applications: [...state.applications, newApp],
      siteVisitations: [...state.siteVisitations, mockVisit],
      industrialAssessments: [...state.industrialAssessments, mockAssessment],
      reportScores: [...state.reportScores, mockReport],
      compiledGrades: [...state.compiledGrades, mockCompiled],
    };
    notify();
    return;
  }
}

// --- Mutations ---

export function updateApplication(id: string, updates: Partial<Application>) {
  state = {
    ...state,
    applications: state.applications.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
  };
  notify();
}

export function addApplication(app: Application) {
  state = { ...state, applications: [...state.applications, app] };
  notify();
}

export function addCompany(company: Company) {
  state = { ...state, companies: [...state.companies, company] };
  notify();
}

export function updateCompany(id: string, updates: Partial<Company>) {
  state = {
    ...state,
    companies: state.companies.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  };
  notify();
}

export function addBranch(branch: Branch) {
  state = { ...state, branches: [...state.branches, branch] };
  notify();
}

export function updateBranch(id: string, updates: Partial<Branch>) {
  state = {
    ...state,
    branches: state.branches.map((b) =>
      b.id === id ? { ...b, ...updates } : b
    ),
  };
  notify();
}

export function addNotification(n: Notification) {
  state = { ...state, notifications: [n, ...state.notifications] };
  notify();
}

export function markNotificationRead(id: string) {
  state = {
    ...state,
    notifications: state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  };
  notify();
}

export function addAuditLog(log: AuditLog) {
  state = { ...state, auditLogs: [log, ...state.auditLogs] };
  notify();
}

export function addTerm(term: Term) {
  state = { ...state, terms: [...state.terms, term] };
  notify();
}

export function updateTerm(id: string, updates: Partial<Term>) {
  const term = state.terms.find((t) => t.id === id);
  let updatedApplications = state.applications;

  if (term && updates.status === "Archived") {
    updatedApplications = state.applications.map((a) => {
      // Allow for both date-based and termId-based matching
      const isMatch = a.termId === term.id || (
        a.dateApplied >= term.applicationStart &&
        a.dateApplied <= term.applicationEnd
      );
      if (isMatch && a.status !== "Completed" && a.status !== "Rejected") {
        return { ...a, status: "Completed" as const };
      }
      return a;
    });
  }

  state = {
    ...state,
    terms: state.terms.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    applications: updatedApplications,
  };
  notify();
}

export function addLogbookEntry(entry: LogbookEntry) {
  state = { ...state, logbookEntries: [entry, ...state.logbookEntries] };
  notify();
}

export function getLogbookEntries(studentId: string): LogbookEntry[] {
  return state.logbookEntries.filter((e) => e.studentId === studentId);
}

export function updateLogbookEntry(id: string, updates: Partial<LogbookEntry>) {
  state = {
    ...state,
    logbookEntries: state.logbookEntries.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ),
  };
  notify();
}

export function getAllLogbookEntries(): LogbookEntry[] {
  return state.logbookEntries;
}

// --- Grading mutations ---

export function upsertGradingConfig(config: DepartmentGradingConfig) {
  const exists = state.gradingConfigs.some((c) => c.id === config.id);
  state = {
    ...state,
    gradingConfigs: exists
      ? state.gradingConfigs.map((c) => (c.id === config.id ? config : c))
      : [...state.gradingConfigs, config],
  };
  notify();
}

export function upsertIndustrialAssessment(a: IndustrialSupervisorAssessment) {
  const exists = state.industrialAssessments.some((x) => x.applicationId === a.applicationId);
  state = {
    ...state,
    industrialAssessments: exists
      ? state.industrialAssessments.map((x) => (x.applicationId === a.applicationId ? a : x))
      : [...state.industrialAssessments, a],
  };
  notify();
}

export function upsertSiteVisitation(v: SiteVisitationScore) {
  const exists = state.siteVisitations.some((x) => x.applicationId === v.applicationId);
  state = {
    ...state,
    siteVisitations: exists
      ? state.siteVisitations.map((x) => (x.applicationId === v.applicationId ? v : x))
      : [...state.siteVisitations, v],
  };
  notify();
}

export function upsertReportScore(r: ReportScore) {
  const exists = state.reportScores.some((x) => x.applicationId === r.applicationId);
  state = {
    ...state,
    reportScores: exists
      ? state.reportScores.map((x) => (x.applicationId === r.applicationId ? r : x))
      : [...state.reportScores, r],
  };
  notify();
}

export function upsertPresentationScore(p: PresentationScore) {
  const exists = state.presentationScores.some((x) => x.applicationId === p.applicationId);
  state = {
    ...state,
    presentationScores: exists
      ? state.presentationScores.map((x) => (x.applicationId === p.applicationId ? p : x))
      : [...state.presentationScores, p],
  };
  notify();
}

export function upsertCompiledGrade(g: CompiledGrade) {
  const exists = state.compiledGrades.some((x) => x.applicationId === g.applicationId);
  state = {
    ...state,
    compiledGrades: exists
      ? state.compiledGrades.map((x) => (x.applicationId === g.applicationId ? g : x))
      : [...state.compiledGrades, g],
  };
  notify();
}